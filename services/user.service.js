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
      orders: { take: 10, orderBy: { orderDate: "desc" } },
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
      orders: { take: 10, orderBy: { orderDate: "desc" } },
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

// ⬛ Delete user
export async function deleteUser(email) {
  return prisma.user.delete({ where: { email } });
}
