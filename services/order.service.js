import prisma from "../config/database.js";
import ResponseError from "../utils/customError.js";
import {
  validatePrivateKey,
  normalizePrivateKey,
  computeOrderHash,
  signData,
  generateQrToken,
  getServerPrivateKey,
  sha256Hash,
} from "../utils/crypto.js";

// =====================================================
// CUSTOMER ACTIONS
// =====================================================

// 🟩 Create order (Customer places order from supplier's inventory)
export async function createOrder(customerId, data) {
  const { supplierId, productId, quantity, deliveryAddress } = data;

  return await prisma.$transaction(async (tx) => {
    // Get supplier profile with warehouse and inventory
    const supplier = await tx.supplierProfile.findUnique({
      where: { id: supplierId },
      include: {
        warehouse: {
          include: {
            inventories: {
              where: { productId },
              include: { product: true },
            },
          },
        },
      },
    });

    if (!supplier) throw new ResponseError("Supplier not found", 404);
    if (!supplier.warehouse)
      throw new ResponseError("Supplier has no warehouse", 404);

    const inventory = supplier.warehouse.inventories[0];
    if (!inventory)
      throw new ResponseError("Product not available from this supplier", 404);

    // Check stock
    if (inventory.quantity < quantity) {
      throw new ResponseError(
        `Insufficient stock. Available: ${inventory.quantity}`,
        400
      );
    }

    // Prevent ordering from self
    const supplierUser = await tx.user.findFirst({
      where: { supplierProfile: { id: supplierId } },
    });
    if (supplierUser && supplierUser.id === customerId) {
      throw new ResponseError("Cannot order from yourself", 400);
    }

    const totalAmount = inventory.product.price * quantity;

    // Create the order
    const order = await tx.order.create({
      data: {
        customerId,
        supplierId,
        productId,
        quantity,
        totalAmount,
        deliveryAddress,
        status: "PENDING",
      },
      include: {
        product: true,
        supplier: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    // Add tracking event
    await tx.trackingEvent.create({
      data: {
        orderId: order.id,
        fromUserId: customerId,
        toUserId: supplierUser?.id,
        status: "PENDING",
        description: `Order placed for ${quantity} x ${inventory.product.name}`,
      },
    });

    return order;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟦 Get my orders (as customer)
export async function getMyOrders(customerId) {
  return prisma.order.findMany({
    where: { customerId },
    include: {
      product: true,
      supplier: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      legs: {
        include: {
          transporter: true,
          toDistributor: {
            include: { user: { select: { name: true } } },
          },
        },
        orderBy: { legNumber: "asc" },
      },
    },
    orderBy: { orderDate: "desc" },
  });
}

// 🟧 Cancel order (Customer cancels before first shipment)
export async function cancelOrder(orderId, customerId) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        legs: true,
        supplier: { include: { warehouse: true } },
      },
    });

    if (!order) throw new ResponseError("Order not found", 404);
    if (order.customerId !== customerId) {
      throw new ResponseError("You can only cancel your own orders", 403);
    }

    // Check if any leg is in transit or beyond
    const hasShipped = order.legs.some((leg) =>
      ["IN_TRANSIT", "DELIVERED"].includes(leg.status)
    );

    if (hasShipped) {
      throw new ResponseError(
        "Cannot cancel: Order is already in transit",
        400
      );
    }

    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      throw new ResponseError(
        `Cannot cancel order with status: ${order.status}`,
        400
      );
    }

    // If order was approved, restore stock
    if (order.status === "APPROVED" || order.status === "IN_PROGRESS") {
      const inventory = await tx.inventory.findFirst({
        where: {
          warehouseId: order.supplier.warehouse?.id,
          productId: order.productId,
        },
      });

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: order.quantity } },
        });
      }
    }

    // Cancel all pending legs
    await tx.orderLeg.updateMany({
      where: {
        orderId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: { status: "REJECTED" },
    });

    // Update order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: { product: true },
    });

    // Add tracking event
    const supplierUser = await tx.user.findFirst({
      where: { supplierProfile: { id: order.supplierId } },
    });

    await tx.trackingEvent.create({
      data: {
        orderId,
        fromUserId: customerId,
        toUserId: supplierUser?.id,
        status: "CANCELLED",
        description: "Order cancelled by customer",
      },
    });

    return updatedOrder;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Confirm delivery (Customer confirms final delivery)
export async function confirmDelivery(orderId, customerId) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        legs: { orderBy: { legNumber: "desc" }, take: 1 },
      },
    });

    if (!order) throw new ResponseError("Order not found", 404);
    if (order.customerId !== customerId) {
      throw new ResponseError("You can only confirm your own orders", 403);
    }

    const lastLeg = order.legs[0];
    if (
      !lastLeg ||
      lastLeg.toType !== "CUSTOMER" ||
      lastLeg.status !== "IN_TRANSIT"
    ) {
      throw new ResponseError(
        "Order is not ready for delivery confirmation",
        400
      );
    }

    // Mark last leg as delivered
    await tx.orderLeg.update({
      where: { id: lastLeg.id },
      data: { status: "DELIVERED" },
    });

    // Mark order as delivered
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" },
      include: { product: true },
    });

    // Add tracking event
    await tx.trackingEvent.create({
      data: {
        orderId,
        legId: lastLeg.id,
        fromUserId: customerId,
        status: "DELIVERED",
        description: "Order delivered and confirmed by customer",
      },
    });

    return updatedOrder;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// =====================================================
// SUPPLIER ACTIONS
// =====================================================

// 🟧 Approve order and create first leg (Supplier approves and assigns distributor)
export async function approveOrder(orderId, supplierId, data) {
  const { distributorId, transporterId, privateKey } = data;

  // Validate privateKey is provided
  if (!privateKey) {
    throw new ResponseError("Private key is required to approve orders", 400);
  }

  return await prisma.$transaction(async (tx) => {
    // Get supplier profile with keys
    const supplierProfile = await tx.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { warehouse: true, user: true },
    });

    if (!supplierProfile)
      throw new ResponseError("Supplier profile not found", 404);

    // Validate supplier's private key
    if (!supplierProfile.privateKeyHash) {
      throw new ResponseError(
        "Supplier keys not configured. Contact admin.",
        500
      );
    }

    // Debug logging
    console.log("=== Private Key Validation Debug ===");
    console.log("RAW INPUT:");
    console.log("Length:", privateKey.length);
    console.log("First 100 chars:", privateKey.substring(0, 100));
    console.log("Has newlines:", privateKey.includes('\n'));

    console.log("\nSTORED HASH:", supplierProfile.privateKeyHash);

    // Test with new normalization
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    let base64Content = privateKey.trim();
    if (base64Content.includes(beginMarker)) {
      base64Content = base64Content.split(beginMarker)[1];
    }
    if (base64Content.includes(endMarker)) {
      base64Content = base64Content.split(endMarker)[0];
    }
    base64Content = base64Content.replace(/\s/g, '');

    const lines = [];
    for (let i = 0; i < base64Content.length; i += 64) {
      lines.push(base64Content.substring(i, i + 64));
    }
    const normalizedKey = beginMarker + '\n' + lines.join('\n') + '\n' + endMarker;

    console.log("\nNORMALIZED KEY:");
    console.log("Length:", normalizedKey.length);
    console.log("First 100 chars:", normalizedKey.substring(0, 100));

    const computedHash = sha256Hash(normalizedKey);
    console.log("\nComputed hash:", computedHash);
    console.log("Stored hash:  ", supplierProfile.privateKeyHash);
    console.log("Hashes match: ", computedHash === supplierProfile.privateKeyHash);
    console.log("====================================");

    if (!validatePrivateKey(privateKey, supplierProfile.privateKeyHash)) {
      throw new ResponseError("Invalid private key", 401);
    }

    // Normalize the private key for use in signing
    const normalizedPrivateKey = normalizePrivateKey(privateKey);

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) throw new ResponseError("Order not found", 404);
    if (order.supplierId !== supplierId) {
      throw new ResponseError("This order is not for you", 403);
    }
    if (order.status !== "PENDING") {
      throw new ResponseError(
        `Cannot approve order with status: ${order.status}`,
        400
      );
    }

    // Verify distributor exists
    const distributor = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });
    if (!distributor) throw new ResponseError("Distributor not found", 404);

    // Verify transporter belongs to supplier
    const transporter = await tx.transporter.findUnique({
      where: { id: transporterId },
    });
    if (!transporter) throw new ResponseError("Transporter not found", 404);
    if (transporter.supplierId !== supplierId) {
      throw new ResponseError("This transporter does not belong to you", 403);
    }

    // Check and deduct stock
    const inventory = await tx.inventory.findFirst({
      where: {
        warehouseId: supplierProfile.warehouse?.id,
        productId: order.productId,
      },
    });

    if (!inventory || inventory.quantity < order.quantity) {
      throw new ResponseError(
        `Insufficient stock. Available: ${inventory?.quantity || 0}`,
        400
      );
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: { quantity: { decrement: order.quantity } },
    });

    // =====================================================
    // DIGITAL SIGNATURE GENERATION
    // =====================================================

    // Compute order hash
    const orderHash = computeOrderHash(order);

    // Sign with supplier's private key (use normalized key)
    const supplierSignature = signData(orderHash, normalizedPrivateKey);

    // Sign with server's private key
    const serverPrivateKey = getServerPrivateKey();
    const serverSignature = signData(supplierSignature, serverPrivateKey);

    // Generate QR token
    const qrToken = generateQrToken({
      orderId: order.id,
      supplierSignature,
      serverSignature,
    });

    // Update order with signatures and status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "APPROVED",
        orderHash,
        supplierSignature,
        serverSignature,
        qrToken,
        signedAt: new Date(),
      },
    });

    // Create first leg: Supplier → Distributor
    const leg = await tx.orderLeg.create({
      data: {
        orderId,
        legNumber: 1,
        fromType: "SUPPLIER",
        fromSupplierId: supplierId,
        toType: "DISTRIBUTOR",
        toDistributorId: distributorId,
        transporterId,
        status: "PENDING",
      },
      include: {
        transporter: true,
        toDistributor: { include: { user: { select: { name: true } } } },
      },
    });

    // Add tracking event
    await tx.trackingEvent.create({
      data: {
        orderId,
        legId: leg.id,
        fromUserId: supplierProfile.user.id,
        toUserId: distributor.user.id,
        status: "APPROVED",
        description: `Order approved and signed. Awaiting distributor ${distributor.businessName} acceptance.`,
      },
    });

    // Build verification URL
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${baseUrl}/verify?token=${qrToken}`;

    return {
      order: await tx.order.findUnique({
        where: { id: orderId },
        include: { product: true, legs: true },
      }),
      leg,
      qrToken,
      verificationUrl,
    };
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Reject order (Supplier rejects)
export async function rejectOrder(orderId, supplierId, reason) {
  return await prisma.$transaction(async (tx) => {
    const supplierProfile = await tx.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplierProfile)
      throw new ResponseError("Supplier profile not found", 404);

    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new ResponseError("Order not found", 404);
    if (order.supplierId !== supplierId) {
      throw new ResponseError("This order is not for you", 403);
    }
    if (order.status !== "PENDING") {
      throw new ResponseError(
        `Cannot reject order with status: ${order.status}`,
        400
      );
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: { product: true, customer: true },
    });

    await tx.trackingEvent.create({
      data: {
        orderId,
        fromUserId: supplierProfile.user.id,
        toUserId: order.customerId,
        status: "CANCELLED",
        description: reason || "Order rejected by supplier",
      },
    });

    return updatedOrder;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Ship order (Supplier marks leg as in-transit after distributor accepts)
export async function shipOrder(orderId, supplierId, legId) {
  return await prisma.$transaction(async (tx) => {
    const supplierProfile = await tx.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplierProfile)
      throw new ResponseError("Supplier profile not found", 404);

    const leg = await tx.orderLeg.findUnique({
      where: { id: legId },
      include: {
        order: true,
        toDistributor: { include: { user: true } },
      },
    });

    if (!leg) throw new ResponseError("Order leg not found", 404);
    if (leg.order.supplierId !== supplierId) {
      throw new ResponseError("This order is not yours", 403);
    }
    if (leg.fromType !== "SUPPLIER" || leg.fromSupplierId !== supplierId) {
      throw new ResponseError("You can only ship legs you created", 403);
    }
    if (leg.status !== "ACCEPTED") {
      throw new ResponseError(
        "Distributor has not accepted this delivery yet",
        400
      );
    }

    // Update leg status
    const updatedLeg = await tx.orderLeg.update({
      where: { id: legId },
      data: { status: "IN_TRANSIT" },
      include: { transporter: true },
    });

    // Update order status to IN_PROGRESS
    await tx.order.update({
      where: { id: leg.orderId },
      data: { status: "IN_PROGRESS" },
    });

    // Add tracking event
    await tx.trackingEvent.create({
      data: {
        orderId: leg.orderId,
        legId,
        fromUserId: supplierProfile.user.id,
        toUserId: leg.toDistributor?.user.id,
        status: "IN_TRANSIT",
        description: `Shipped to distributor ${leg.toDistributor?.businessName}`,
      },
    });

    return updatedLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Reassign order (Supplier picks new distributor after rejection)
export async function reassignOrder(orderId, supplierId, data) {
  const { distributorId, transporterId } = data;

  return await prisma.$transaction(async (tx) => {
    const supplierProfile = await tx.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplierProfile)
      throw new ResponseError("Supplier profile not found", 404);

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        legs: { orderBy: { legNumber: "desc" } },
      },
    });

    if (!order) throw new ResponseError("Order not found", 404);
    if (order.supplierId !== supplierId) {
      throw new ResponseError("This order is not for you", 403);
    }

    // Can only reassign if status is PENDING_REASSIGN or APPROVED (distributor rejected)
    if (!["PENDING_REASSIGN", "APPROVED"].includes(order.status)) {
      throw new ResponseError(
        `Cannot reassign order with status: ${order.status}`,
        400
      );
    }

    // Check that the last leg was rejected
    const lastLeg = order.legs[0];
    if (lastLeg && lastLeg.status !== "REJECTED") {
      throw new ResponseError(
        "Can only reassign after distributor rejects",
        400
      );
    }

    // Check it's not the same distributor
    if (lastLeg && lastLeg.toDistributorId === distributorId) {
      throw new ResponseError(
        "Choose a different distributor - this one already rejected",
        400
      );
    }

    // Verify new distributor exists
    const distributor = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });
    if (!distributor) throw new ResponseError("Distributor not found", 404);

    // Verify transporter belongs to supplier
    const transporter = await tx.transporter.findUnique({
      where: { id: transporterId },
    });
    if (!transporter) throw new ResponseError("Transporter not found", 404);
    if (transporter.supplierId !== supplierId) {
      throw new ResponseError("This transporter does not belong to you", 403);
    }

    // Create new leg with next leg number
    const newLegNumber = lastLeg ? lastLeg.legNumber + 1 : 1;

    const newLeg = await tx.orderLeg.create({
      data: {
        orderId,
        legNumber: newLegNumber,
        fromType: "SUPPLIER",
        fromSupplierId: supplierId,
        toType: "DISTRIBUTOR",
        toDistributorId: distributorId,
        transporterId,
        status: "PENDING",
      },
      include: {
        transporter: true,
        toDistributor: { include: { user: { select: { name: true } } } },
      },
    });

    // Update order status back to APPROVED
    await tx.order.update({
      where: { id: orderId },
      data: { status: "APPROVED" },
    });

    // Add tracking event
    await tx.trackingEvent.create({
      data: {
        orderId,
        legId: newLeg.id,
        fromUserId: supplierProfile.user.id,
        toUserId: distributor.user.id,
        status: "REASSIGNED",
        description: `Order reassigned to distributor ${distributor.businessName} after previous rejection.`,
      },
    });

    return {
      order: await tx.order.findUnique({
        where: { id: orderId },
        include: { product: true, legs: { orderBy: { legNumber: "asc" } } },
      }),
      leg: newLeg,
    };
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// =====================================================
// PUBLIC / BROWSE
// =====================================================

// 🟦 Get all available products (from all suppliers)
export async function getAvailableProducts() {
  const inventories = await prisma.inventory.findMany({
    where: { quantity: { gt: 0 } },
    include: {
      product: true,
      warehouse: {
        include: {
          supplier: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return inventories.map((inv) => ({
    productId: inv.product.id,
    name: inv.product.name,
    category: inv.product.category,
    description: inv.product.description,
    price: inv.product.price,
    availableQuantity: inv.quantity,
    supplierId: inv.warehouse.supplier.id,
    supplierName: inv.warehouse.supplier.businessName,
    supplierUserId: inv.warehouse.supplier.user.id,
  }));
}

// 🟦 Get order by ID (for customer or supplier)
export async function getOrderById(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      customer: { select: { id: true, name: true, email: true } },
      supplier: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      legs: {
        include: {
          transporter: true,
          fromSupplier: { include: { user: { select: { name: true } } } },
          fromDistributor: { include: { user: { select: { name: true } } } },
          toDistributor: { include: { user: { select: { name: true } } } },
        },
        orderBy: { legNumber: "asc" },
      },
      trackingEvents: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!order) throw new ResponseError("Order not found", 404);

  // Check access
  const isCustomer = order.customerId === userId;
  const isSupplier = order.supplier.user.id === userId;

  if (!isCustomer && !isSupplier) {
    throw new ResponseError("You don't have access to this order", 403);
  }

  return order;
}
