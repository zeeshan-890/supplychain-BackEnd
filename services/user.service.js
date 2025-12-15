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
  // Delete user and all related records in a transaction
  return await prisma.$transaction(async (tx) => {
    // Delete tracking events
    await tx.trackingEvent.deleteMany({ where: { OR: [{ fromUserId: id }, { toUserId: id }] } });
    
    // Delete role requests
    await tx.roleRequest.deleteMany({ where: { userId: id } });
    
    // Get user to check for profiles
    const user = await tx.user.findUnique({
      where: { id },
      include: {
        supplierProfile: { include: { warehouse: true } },
        distributorProfile: true,
      },
    });
    
    if (!user) return null;
    
    // If user has supplier profile, delete related data
    if (user.supplierProfile) {
      const supplierId = user.supplierProfile.id;
      
      // Delete warehouse inventories
      if (user.supplierProfile.warehouse) {
        await tx.inventory.deleteMany({ where: { warehouseId: user.supplierProfile.warehouse.id } });
        await tx.warehouse.delete({ where: { id: user.supplierProfile.warehouse.id } });
      }
      
      // Delete products
      await tx.product.deleteMany({ where: { supplierId } });
      
      // Delete transporters
      await tx.transporter.deleteMany({ where: { supplierId } });
      
      // Handle orders where user is supplier (set to null or handle appropriately)
      // Note: Cannot delete orders as they reference the supplier, might need different handling
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
    
    // Delete orders where user is customer
    await tx.order.deleteMany({ where: { customerId: id } });
    
    // Finally delete the user
    return await tx.user.delete({ where: { id } });
  });
}
