import prisma from "../config/database.js";
import bcrypt from "bcrypt";

// 🟩 Create a new user (used for manual signup or admin panel)
export async function createUser(data) {
  const { password, ...rest } = data;

  let hashedPassword;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  return prisma.user.create({
    data: {
      ...rest,
      password: hashedPassword,
    },
  });
}

// 🟦 Get all users (admin-only)
export async function getAllUsers() {
  return prisma.user.findMany({
    include: {
      supplierProfile: true,
      distributorProfile: true,
    },
  });
}

// 🟨 Get user by ID
export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      supplierProfile: {
        include: {
          warehouse: true,
        },
      },
      distributorProfile: true,
      ordersAsCustomer: { take: 10, orderBy: { orderDate: "desc" } },
    },
  });
}

// 🟧 Get user by email (useful for login)
export async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      supplierProfile: {
        include: {
          warehouse: true,
        },
      },
      distributorProfile: true,
      ordersAsCustomer: { take: 10, orderBy: { orderDate: "desc" } },
    },
  });
}

// 🟥 Update user info
export async function updateUser(email, data) {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return prisma.user.update({
    where: { email },
    data,
  });
}

// ⬛ Delete user (self)
export async function deleteUser(email) {
  return prisma.user.delete({ where: { email } });
}

// 🟥 Delete user by ID (admin only)
export async function deleteUserById(id) {
  // Delete user and all related records in a transaction with extended timeout
  return await prisma.$transaction(async (tx) => {
    // Get user to check for profiles first
    const user = await tx.user.findUnique({
      where: { id },
      include: {
        supplierProfile: { include: { warehouse: true } },
        distributorProfile: true,
      },
    });

    if (!user) return null;

    // Delete tracking events
    await tx.trackingEvent.deleteMany({
      where: { OR: [{ fromUserId: id }, { toUserId: id }] }
    });

    // Delete role requests
    await tx.roleRequest.deleteMany({ where: { userId: id } });

    // If user has supplier profile, delete related data
    if (user.supplierProfile) {
      const supplierId = user.supplierProfile.id;

      // Delete order legs associated with supplier orders first
      const supplierOrders = await tx.order.findMany({
        where: { supplierId },
        select: { id: true }
      });
      const orderIds = supplierOrders.map(o => o.id);

      if (orderIds.length > 0) {
        await tx.orderLeg.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.trackingEvent.deleteMany({ where: { orderId: { in: orderIds } } });
      }

      // Delete warehouse inventories
      if (user.supplierProfile.warehouse) {
        await tx.inventory.deleteMany({
          where: { warehouseId: user.supplierProfile.warehouse.id }
        });
        await tx.warehouse.delete({
          where: { id: user.supplierProfile.warehouse.id }
        });
      }

      // Delete products
      await tx.product.deleteMany({ where: { supplierId } });

      // Delete transporters
      await tx.transporter.deleteMany({ where: { supplierId } });

      // Delete orders where user is supplier
      await tx.order.deleteMany({ where: { supplierId } });

      // Delete supplier profile
      await tx.supplierProfile.delete({ where: { id: supplierId } });
    }

    // If user has distributor profile, delete related data
    if (user.distributorProfile) {
      const distributorId = user.distributorProfile.id;

      // Delete order legs
      await tx.orderLeg.deleteMany({ where: { distributorId } });

      // Delete distributor profile
      await tx.distributorProfile.delete({ where: { id: distributorId } });
    }

    // Delete orders where user is customer (with cascade)
    const customerOrders = await tx.order.findMany({
      where: { customerId: id },
      select: { id: true }
    });
    const customerOrderIds = customerOrders.map(o => o.id);

    if (customerOrderIds.length > 0) {
      await tx.orderLeg.deleteMany({ where: { orderId: { in: customerOrderIds } } });
      await tx.trackingEvent.deleteMany({ where: { orderId: { in: customerOrderIds } } });
      await tx.order.deleteMany({ where: { customerId: id } });
    }

    // Finally delete the user
    return await tx.user.delete({ where: { id } });
  }, {
    maxWait: 15000, // 15 seconds max wait
    timeout: 15000, // 15 seconds timeout
  });
}
