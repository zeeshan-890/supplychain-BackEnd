import prisma from "../config/database.js";
import ResponseError from "../utils/customError.js";

// =====================================================
// PROFILE
// =====================================================

// 🟦 Get my distributor profile
export async function getMyProfile(userId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
    include: {
      transporters: true,
    },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  return profile;
}

// 🟧 Update my distributor profile
export async function updateMyProfile(userId, data) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  return prisma.distributorProfile.update({
    where: { userId },
    data: {
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      contactNumber: data.contactNumber,
      NTN: data.NTN,
      serviceArea: data.serviceArea,
    },
  });
}

// =====================================================
// TRANSPORTERS (Distributor's own transporters)
// =====================================================

// 🟩 Create transporter
export async function createTransporter(userId, data) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  return prisma.transporter.create({
    data: {
      name: data.name,
      phone: data.phone,
      distributorId: profile.id,
    },
  });
}

// 🟦 Get my transporters
export async function getMyTransporters(userId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  return prisma.transporter.findMany({
    where: { distributorId: profile.id },
  });
}

// 🟧 Update transporter
export async function updateTransporter(userId, transporterId, data) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  const transporter = await prisma.transporter.findUnique({
    where: { id: transporterId },
  });

  if (!transporter) throw new ResponseError("Transporter not found", 404);
  if (transporter.distributorId !== profile.id) {
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
    const profile = await tx.distributorProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new ResponseError("Distributor profile not found", 404);

    const transporter = await tx.transporter.findUnique({
      where: { id: transporterId },
    });

    if (!transporter) throw new ResponseError("Transporter not found", 404);
    if (transporter.distributorId !== profile.id) {
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
  }, {
    maxWait: 15000,
    timeout: 15000
  });
}

// =====================================================
// ASSIGNED ORDERS (Orders assigned to this distributor)
// =====================================================

// 🟦 Get orders assigned to me (legs where I'm the recipient)
export async function getAssignedOrders(userId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  // Get all legs where this distributor is the recipient (toDistributorId)
  const legs = await prisma.orderLeg.findMany({
    where: { toDistributorId: profile.id },
    include: {
      order: {
        include: {
          product: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
          supplier: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      transporter: true,
      fromSupplier: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      fromDistributor: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return legs;
}

// 🟦 Get orders I'm currently holding (legs I received but haven't forwarded)
export async function getHeldOrders(userId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  // Get legs where I'm the recipient and status is DELIVERED (I received it)
  // and the order doesn't have a next leg from me yet
  const deliveredLegs = await prisma.orderLeg.findMany({
    where: {
      toDistributorId: profile.id,
      status: "DELIVERED",
    },
    include: {
      order: {
        include: {
          product: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
          legs: {
            orderBy: { legNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Filter: only include if the latest leg is the one delivered to me
  // (meaning I haven't created a forward leg yet)
  return deliveredLegs.filter((leg) => {
    const latestLeg = leg.order.legs[0];
    return latestLeg && latestLeg.id === leg.id;
  });
}

// 🟦 Get all other distributors (to forward orders)
export async function getAllDistributors(userId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  // Get all distributors except self
  return prisma.distributorProfile.findMany({
    where: {
      id: { not: profile.id },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

// 🟦 Get all distributors (admin only)
export async function getAllDistributorsAdmin() {
  return prisma.distributorProfile.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

// =====================================================
// LEG TRACKING
// =====================================================

// 🟦 Get all legs I've sent out (outgoing)
export async function getOutgoingLegs(userId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  // Get all legs where this distributor is the sender (fromDistributorId)
  const legs = await prisma.orderLeg.findMany({
    where: { fromDistributorId: profile.id },
    include: {
      order: {
        select: {
          id: true,
          quantity: true,
          totalAmount: true,
          status: true,
          qrToken: true,
          signedAt: true,
          orderDate: true,
          product: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
          supplier: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      transporter: true,
      toDistributor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return legs;
}

// 🟦 Get specific leg by ID (if I'm involved)
export async function getLegById(userId, legId) {
  const profile = await prisma.distributorProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new ResponseError("Distributor profile not found", 404);

  const leg = await prisma.orderLeg.findUnique({
    where: { id: legId },
    include: {
      order: {
        include: {
          product: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
          supplier: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      transporter: true,
      fromSupplier: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      fromDistributor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      toDistributor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!leg) throw new ResponseError("Order leg not found", 404);

  // Check if this distributor is involved (either sender or receiver)
  const isInvolved =
    leg.fromDistributorId === profile.id || leg.toDistributorId === profile.id;

  if (!isInvolved) {
    throw new ResponseError("You are not involved in this delivery", 403);
  }

  return leg;
}
