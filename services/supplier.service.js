import prisma from "../config/database.js";
import ResponseError from "../utils/customError.js";

// =====================================================
// PROFILE & WAREHOUSE
// =====================================================

// 🟦 Get my supplier profile with warehouse
export async function getMyProfile(userId) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
    include: {
      warehouse: {
        include: {
          inventories: {
            include: { product: true },
          },
        },
      },
      products: true,
      transporters: true,
    },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return profile;
}

// 🟧 Update my supplier profile
export async function updateMyProfile(userId, data) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return prisma.supplierProfile.update({
    where: { userId },
    data: {
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      contactNumber: data.contactNumber,
      NTN: data.NTN,
      licenseNumber: data.licenseNumber,
    },
  });
}

// 🟧 Update warehouse details
export async function updateWarehouse(userId, data) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
    include: { warehouse: true },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);
  if (!profile.warehouse) throw new ResponseError("Warehouse not found", 404);

  return prisma.warehouse.update({
    where: { id: profile.warehouse.id },
    data: {
      name: data.name,
      address: data.address,
    },
  });
}

// =====================================================
// PRODUCTS (Only suppliers create products)
// =====================================================

// 🟩 Create product
export async function createProduct(userId, data) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return prisma.product.create({
    data: {
      name: data.name,
      category: data.category,
      batchNo: data.batchNo,
      qrCode: data.qrCode || null,
      description: data.description || null,
      price: data.price,
      supplierId: profile.id,
    },
  });
}

// 🟦 Get my products
export async function getMyProducts(userId) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return prisma.product.findMany({
    where: { supplierId: profile.id },
    include: {
      inventories: true,
    },
  });
}

// 🟧 Update my product
export async function updateProduct(userId, productId, data) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) throw new ResponseError("Product not found", 404);
  if (product.supplierId !== profile.id) {
    throw new ResponseError("You do not own this product", 403);
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      category: data.category,
      batchNo: data.batchNo,
      qrCode: data.qrCode,
      description: data.description,
      price: data.price,
    },
  });
}

// ⬛ Delete my product
export async function deleteProduct(userId, productId) {
  return await prisma.$transaction(async (tx) => {
    const profile = await tx.supplierProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new ResponseError("Supplier profile not found", 404);

    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new ResponseError("Product not found", 404);
    if (product.supplierId !== profile.id) {
      throw new ResponseError("You do not own this product", 403);
    }

    // Check for active orders
    const activeOrders = await tx.order.count({
      where: {
        productId,
        status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] },
      },
    });

    if (activeOrders > 0) {
      throw new ResponseError("Cannot delete product with active orders", 400);
    }

    // Delete inventory entries first
    await tx.inventory.deleteMany({
      where: { productId },
    });

    return tx.product.delete({
      where: { id: productId },
    });
  });
}

// =====================================================
// INVENTORY (in Warehouse)
// =====================================================

// 🟩 Add product to inventory
export async function addToInventory(userId, data) {
  return await prisma.$transaction(async (tx) => {
    const profile = await tx.supplierProfile.findUnique({
      where: { userId },
      include: { warehouse: true },
    });

    if (!profile) throw new ResponseError("Supplier profile not found", 404);
    if (!profile.warehouse) throw new ResponseError("Warehouse not found", 404);

    // Verify product belongs to this supplier
    const product = await tx.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) throw new ResponseError("Product not found", 404);
    if (product.supplierId !== profile.id) {
      throw new ResponseError("Product does not belong to you", 403);
    }

    // Upsert inventory (add or update quantity)
    return tx.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: profile.warehouse.id,
          productId: data.productId,
        },
      },
      update: {
        quantity: { increment: data.quantity },
      },
      create: {
        warehouseId: profile.warehouse.id,
        productId: data.productId,
        quantity: data.quantity,
      },
      include: { product: true },
    });
  });
}

// 🟧 Update inventory quantity (set absolute value)
export async function updateInventory(userId, inventoryId, quantity) {
  return await prisma.$transaction(async (tx) => {
    const profile = await tx.supplierProfile.findUnique({
      where: { userId },
      include: { warehouse: true },
    });

    if (!profile) throw new ResponseError("Supplier profile not found", 404);

    const inventory = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) throw new ResponseError("Inventory not found", 404);
    if (inventory.warehouseId !== profile.warehouse?.id) {
      throw new ResponseError("This inventory is not in your warehouse", 403);
    }

    if (quantity < 0) {
      throw new ResponseError("Quantity cannot be negative", 400);
    }

    return tx.inventory.update({
      where: { id: inventoryId },
      data: { quantity },
      include: { product: true },
    });
  });
}

// 🟦 Get my inventory
export async function getMyInventory(userId) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
    include: { warehouse: true },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);
  if (!profile.warehouse) throw new ResponseError("Warehouse not found", 404);

  return prisma.inventory.findMany({
    where: { warehouseId: profile.warehouse.id },
    include: { product: true },
  });
}

// ⬛ Remove from inventory
export async function removeFromInventory(userId, inventoryId) {
  return await prisma.$transaction(async (tx) => {
    const profile = await tx.supplierProfile.findUnique({
      where: { userId },
      include: { warehouse: true },
    });

    if (!profile) throw new ResponseError("Supplier profile not found", 404);

    const inventory = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) throw new ResponseError("Inventory not found", 404);
    if (inventory.warehouseId !== profile.warehouse?.id) {
      throw new ResponseError("This inventory is not in your warehouse", 403);
    }

    // Check for pending orders
    const pendingOrders = await tx.order.count({
      where: {
        productId: inventory.productId,
        supplierId: profile.id,
        status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] },
      },
    });

    if (pendingOrders > 0) {
      throw new ResponseError(
        "Cannot remove: There are pending orders for this product",
        400
      );
    }

    return tx.inventory.delete({
      where: { id: inventoryId },
    });
  });
}

// =====================================================
// TRANSPORTERS (Supplier's own transporters)
// =====================================================

// 🟩 Create transporter
export async function createTransporter(userId, data) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return prisma.transporter.create({
    data: {
      name: data.name,
      phone: data.phone,
      supplierId: profile.id,
    },
  });
}

// 🟦 Get my transporters
export async function getMyTransporters(userId) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return prisma.transporter.findMany({
    where: { supplierId: profile.id },
  });
}

// 🟧 Update transporter
export async function updateTransporter(userId, transporterId, data) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  const transporter = await prisma.transporter.findUnique({
    where: { id: transporterId },
  });

  if (!transporter) throw new ResponseError("Transporter not found", 404);
  if (transporter.supplierId !== profile.id) {
    throw new ResponseError("You do not own this transporter", 403);
  }

  return prisma.transporter.update({
    where: { id: transporterId },
    data: {
      name: data.name,
      phone: data.phone,
    },
  });
}

// ⬛ Delete transporter
export async function deleteTransporter(userId, transporterId) {
  return await prisma.$transaction(async (tx) => {
    const profile = await tx.supplierProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new ResponseError("Supplier profile not found", 404);

    const transporter = await tx.transporter.findUnique({
      where: { id: transporterId },
    });

    if (!transporter) throw new ResponseError("Transporter not found", 404);
    if (transporter.supplierId !== profile.id) {
      throw new ResponseError("You do not own this transporter", 403);
    }

    // Check for active deliveries
    const activeLegs = await tx.orderLeg.count({
      where: {
        transporterId,
        status: { in: ["PENDING", "ACCEPTED", "IN_TRANSIT"] },
      },
    });

    if (activeLegs > 0) {
      throw new ResponseError(
        "Cannot delete: Transporter has active deliveries",
        400
      );
    }

    return tx.transporter.delete({
      where: { id: transporterId },
    });
  });
}

// =====================================================
// ORDERS (Supplier receives orders from customers)
// =====================================================

// 🟦 Get orders received (as supplier)
export async function getMyOrders(userId) {
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Supplier profile not found", 404);

  return prisma.order.findMany({
    where: { supplierId: profile.id },
    include: {
      product: true,
      customer: {
        select: { id: true, name: true, email: true },
      },
      legs: {
        include: {
          transporter: true,
          toDistributor: true,
        },
        orderBy: { legNumber: "asc" },
      },
    },
    orderBy: { orderDate: "desc" },
  });
}

// 🟦 Get all distributors (to select for order assignment)
export async function getAllDistributors() {
  return prisma.distributorProfile.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

// 🟦 Get all suppliers (admin only)
export async function getAllSuppliers() {
  return prisma.supplierProfile.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      warehouse: true,
    },
  });
}
