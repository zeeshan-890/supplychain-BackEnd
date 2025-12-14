import prisma from "../config/database.js";
import ResponseError from "../utils/customError.js";

// =====================================================
// DISTRIBUTOR ACTIONS ON ORDER LEGS
// =====================================================

// 🟧 Accept leg (Distributor accepts to receive delivery)
export async function acceptLeg(legId, distributorId) {
  return await prisma.$transaction(async (tx) => {
    const distributorProfile = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });

    if (!distributorProfile) {
      throw new ResponseError("Distributor profile not found", 404);
    }

    const leg = await tx.orderLeg.findUnique({
      where: { id: legId },
      include: {
        order: true,
        fromSupplier: { include: { user: true } },
        fromDistributor: { include: { user: true } },
      },
    });

    if (!leg) throw new ResponseError("Order leg not found", 404);
    if (leg.toDistributorId !== distributorId) {
      throw new ResponseError("This delivery is not assigned to you", 403);
    }
    if (leg.status !== "PENDING") {
      throw new ResponseError(
        `Cannot accept leg with status: ${leg.status}`,
        400
      );
    }

    const updatedLeg = await tx.orderLeg.update({
      where: { id: legId },
      data: { status: "ACCEPTED" },
      include: { transporter: true },
    });

    // Get sender user ID
    const senderUserId =
      leg.fromSupplier?.user.id || leg.fromDistributor?.user.id;

    await tx.trackingEvent.create({
      data: {
        orderId: leg.orderId,
        legId,
        fromUserId: distributorProfile.user.id,
        toUserId: senderUserId,
        status: "ACCEPTED",
        description: `Distributor ${distributorProfile.businessName} accepted the delivery`,
      },
    });

    return updatedLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Reject leg (Distributor declines to receive)
export async function rejectLeg(legId, distributorId, reason) {
  return await prisma.$transaction(async (tx) => {
    const distributorProfile = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });

    if (!distributorProfile) {
      throw new ResponseError("Distributor profile not found", 404);
    }

    const leg = await tx.orderLeg.findUnique({
      where: { id: legId },
      include: {
        order: true,
        fromSupplier: { include: { user: true } },
        fromDistributor: { include: { user: true } },
      },
    });

    if (!leg) throw new ResponseError("Order leg not found", 404);
    if (leg.toDistributorId !== distributorId) {
      throw new ResponseError("This delivery is not assigned to you", 403);
    }
    if (leg.status !== "PENDING") {
      throw new ResponseError(
        `Cannot reject leg with status: ${leg.status}`,
        400
      );
    }

    const updatedLeg = await tx.orderLeg.update({
      where: { id: legId },
      data: { status: "REJECTED" },
    });

    // If this was the first leg (from supplier), set order back to PENDING_REASSIGN
    // so supplier knows they need to pick a different distributor
    if (leg.fromType === "SUPPLIER" && leg.legNumber === 1) {
      await tx.order.update({
        where: { id: leg.orderId },
        data: { status: "PENDING_REASSIGN" },
      });
    }

    // If this was from a distributor, mark the leg for reassignment
    // so the sending distributor can reassign to a different target
    if (leg.fromType === "DISTRIBUTOR") {
      await tx.orderLeg.update({
        where: { id: legId },
        data: { status: "REJECTED" },
      });
    }

    const senderUserId =
      leg.fromSupplier?.user.id || leg.fromDistributor?.user.id;

    await tx.trackingEvent.create({
      data: {
        orderId: leg.orderId,
        legId,
        fromUserId: distributorProfile.user.id,
        toUserId: senderUserId,
        status: "REJECTED",
        description:
          reason ||
          `Distributor ${distributorProfile.businessName} rejected the delivery`,
      },
    });

    return updatedLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Confirm receipt (Distributor confirms they received the goods)
export async function confirmReceipt(legId, distributorId) {
  return await prisma.$transaction(async (tx) => {
    const distributorProfile = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });

    if (!distributorProfile) {
      throw new ResponseError("Distributor profile not found", 404);
    }

    const leg = await tx.orderLeg.findUnique({
      where: { id: legId },
      include: {
        order: true,
        fromSupplier: { include: { user: true } },
        fromDistributor: { include: { user: true } },
      },
    });

    if (!leg) throw new ResponseError("Order leg not found", 404);
    if (leg.toDistributorId !== distributorId) {
      throw new ResponseError("This delivery is not assigned to you", 403);
    }
    if (leg.status !== "IN_TRANSIT") {
      throw new ResponseError("Shipment is not in transit", 400);
    }

    const updatedLeg = await tx.orderLeg.update({
      where: { id: legId },
      data: { status: "DELIVERED" },
    });

    const senderUserId =
      leg.fromSupplier?.user.id || leg.fromDistributor?.user.id;

    await tx.trackingEvent.create({
      data: {
        orderId: leg.orderId,
        legId,
        fromUserId: distributorProfile.user.id,
        toUserId: senderUserId,
        status: "DELIVERED",
        description: `Goods received by ${distributorProfile.businessName}`,
      },
    });

    return updatedLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟩 Forward order (Distributor creates next leg - to another distributor or customer)
export async function forwardOrder(orderId, distributorId, data) {
  const { toType, toDistributorId, transporterId } = data;

  return await prisma.$transaction(async (tx) => {
    const distributorProfile = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });

    if (!distributorProfile) {
      throw new ResponseError("Distributor profile not found", 404);
    }

    // Get the order and verify distributor has received it
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        legs: { orderBy: { legNumber: "desc" } },
        customer: true,
      },
    });

    if (!order) throw new ResponseError("Order not found", 404);

    const lastLeg = order.legs[0];
    if (!lastLeg) {
      throw new ResponseError("No previous leg found", 400);
    }
    if (lastLeg.toDistributorId !== distributorId) {
      throw new ResponseError("You don't have this order", 403);
    }
    if (lastLeg.status !== "DELIVERED") {
      throw new ResponseError("You haven't received this order yet", 400);
    }

    // Check if there's already a forward leg
    const existingForwardLeg = await tx.orderLeg.findFirst({
      where: {
        orderId,
        fromDistributorId: distributorId,
        legNumber: { gt: lastLeg.legNumber },
      },
    });

    if (existingForwardLeg) {
      throw new ResponseError("You have already forwarded this order", 400);
    }

    // Verify transporter belongs to this distributor
    const transporter = await tx.transporter.findUnique({
      where: { id: transporterId },
    });

    if (!transporter) throw new ResponseError("Transporter not found", 404);
    if (transporter.distributorId !== distributorId) {
      throw new ResponseError("This transporter does not belong to you", 403);
    }

    // Validate destination
    let targetDistributor = null;
    if (toType === "DISTRIBUTOR") {
      if (!toDistributorId) {
        throw new ResponseError("Distributor ID required", 400);
      }
      if (toDistributorId === distributorId) {
        throw new ResponseError("Cannot forward to yourself", 400);
      }
      targetDistributor = await tx.distributorProfile.findUnique({
        where: { id: toDistributorId },
        include: { user: true },
      });
      if (!targetDistributor) {
        throw new ResponseError("Target distributor not found", 404);
      }
    } else if (toType !== "CUSTOMER") {
      throw new ResponseError(
        "Invalid destination type. Use DISTRIBUTOR or CUSTOMER",
        400
      );
    }

    // Create next leg
    const newLegNumber = lastLeg.legNumber + 1;
    const newLeg = await tx.orderLeg.create({
      data: {
        orderId,
        legNumber: newLegNumber,
        fromType: "DISTRIBUTOR",
        fromDistributorId: distributorId,
        toType,
        toDistributorId: toType === "DISTRIBUTOR" ? toDistributorId : null,
        transporterId,
        status: "PENDING",
      },
      include: {
        transporter: true,
        toDistributor: { include: { user: { select: { name: true } } } },
      },
    });

    // Determine recipient for tracking
    const recipientUserId =
      toType === "CUSTOMER" ? order.customerId : targetDistributor?.user.id;

    const recipientName =
      toType === "CUSTOMER"
        ? order.customer.name
        : targetDistributor?.businessName;

    await tx.trackingEvent.create({
      data: {
        orderId,
        legId: newLeg.id,
        fromUserId: distributorProfile.user.id,
        toUserId: recipientUserId,
        status: "PENDING",
        description: `Forwarded to ${toType === "CUSTOMER" ? "customer" : "distributor"
          } ${recipientName}`,
      },
    });

    return newLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟧 Ship forward (Distributor marks their leg as in-transit)
export async function shipForward(legId, distributorId) {
  return await prisma.$transaction(async (tx) => {
    const distributorProfile = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });

    if (!distributorProfile) {
      throw new ResponseError("Distributor profile not found", 404);
    }

    const leg = await tx.orderLeg.findUnique({
      where: { id: legId },
      include: {
        order: { include: { customer: true } },
        toDistributor: { include: { user: true } },
      },
    });

    if (!leg) throw new ResponseError("Order leg not found", 404);
    if (leg.fromDistributorId !== distributorId) {
      throw new ResponseError("You didn't create this leg", 403);
    }
    if (leg.status !== "PENDING" && leg.status !== "ACCEPTED") {
      throw new ResponseError(
        `Cannot ship leg with status: ${leg.status}`,
        400
      );
    }

    // If going to distributor, they must have accepted first
    if (leg.toType === "DISTRIBUTOR" && leg.status !== "ACCEPTED") {
      throw new ResponseError(
        "Recipient distributor has not accepted yet",
        400
      );
    }

    // If going to customer, can ship directly (status: PENDING -> IN_TRANSIT)
    const updatedLeg = await tx.orderLeg.update({
      where: { id: legId },
      data: { status: "IN_TRANSIT" },
      include: { transporter: true },
    });

    const recipientUserId =
      leg.toType === "CUSTOMER"
        ? leg.order.customerId
        : leg.toDistributor?.user.id;

    const recipientName =
      leg.toType === "CUSTOMER"
        ? leg.order.customer.name
        : leg.toDistributor?.businessName;

    await tx.trackingEvent.create({
      data: {
        orderId: leg.orderId,
        legId,
        fromUserId: distributorProfile.user.id,
        toUserId: recipientUserId,
        status: "IN_TRANSIT",
        description: `Shipped to ${leg.toType === "CUSTOMER" ? "customer" : "distributor"
          } ${recipientName}`,
      },
    });

    return updatedLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// 🟦 Get leg by ID
export async function getLegById(legId) {
  const leg = await prisma.orderLeg.findUnique({
    where: { id: legId },
    include: {
      order: {
        include: {
          product: true,
          customer: { select: { id: true, name: true, email: true } },
          supplier: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
      transporter: true,
      fromSupplier: { include: { user: { select: { name: true } } } },
      fromDistributor: { include: { user: { select: { name: true } } } },
      toDistributor: { include: { user: { select: { name: true } } } },
    },
  });

  if (!leg) throw new ResponseError("Order leg not found", 404);

  return leg;
}

// 🟧 Reassign rejected leg (distributor reassigns to different target)
export async function reassignDistributorLeg(
  legId,
  distributorId,
  newDistributorId,
  transporterId
) {
  return await prisma.$transaction(async (tx) => {
    const distributorProfile = await tx.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });

    if (!distributorProfile) {
      throw new ResponseError("Distributor profile not found", 404);
    }

    // Get the rejected leg
    const leg = await tx.orderLeg.findUnique({
      where: { id: legId },
      include: {
        order: true,
        transporter: true,
      },
    });

    if (!leg) throw new ResponseError("Order leg not found", 404);
    if (leg.fromDistributorId !== distributorId) {
      throw new ResponseError("You are not the sender of this leg", 403);
    }
    if (leg.status !== "REJECTED") {
      throw new ResponseError(
        "Can only reassign rejected legs",
        400
      );
    }

    // Verify new distributor exists
    const newDistributor = await tx.distributorProfile.findUnique({
      where: { id: newDistributorId },
      include: { user: true },
    });

    if (!newDistributor) {
      throw new ResponseError("New distributor not found", 404);
    }
    if (newDistributorId === distributorId) {
      throw new ResponseError("Cannot reassign to yourself", 400);
    }

    // Verify transporter belongs to this distributor
    const transporter = await tx.transporter.findUnique({
      where: { id: transporterId },
    });

    if (!transporter) throw new ResponseError("Transporter not found", 404);
    if (transporter.distributorId !== distributorId) {
      throw new ResponseError("This transporter does not belong to you", 403);
    }

    const newLegNumber = leg ? leg.legNumber + 1 : 1;
    // Create a NEW leg instead of updating the old rejected one
    // This maintains the history of the rejection
    const newLeg = await tx.orderLeg.create({
      data: {
        orderId: leg.orderId,
        legNumber: newLegNumber, // Keep the same leg number, but this is a new attempt
        fromType: "DISTRIBUTOR",
        fromDistributorId: distributorId,
        toType: "DISTRIBUTOR",
        toDistributorId: newDistributorId,
        transporterId: transporterId,
        status: "PENDING",
      },
      include: {
        transporter: true,
        toDistributor: { include: { user: { select: { name: true } } } },
      },
    });

    // Create tracking event
    await tx.trackingEvent.create({
      data: {
        orderId: leg.orderId,
        legId: newLeg.id,
        fromUserId: distributorProfile.user.id,
        toUserId: newDistributor.user.id,
        status: "PENDING",
        description: `New leg created after rejection - assigned to ${newDistributor.businessName} by ${distributorProfile.businessName}`,
      },
    });

    return newLeg;
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}
