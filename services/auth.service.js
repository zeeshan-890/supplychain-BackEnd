import prisma from "../config/database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import ResponseError from "../utils/customError.js";
import { transporter, mailOptions } from "../config/nodemailer.js";

// 🟩 Generate OTP (6 digits)
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🟦 Send OTP
async function sendOtpEmail(email, otp) {
  await transporter.sendMail(
    mailOptions(
      email,
      "Your OTP Code",
      `Your OTP is ${otp}`,
      `<p>Your OTP code is <b>${otp}</b>. It will expire in 10 minutes.</p>`
    )
  );
}

// --------------------------------------------------------
// 🔐 LOGIN USER (NO TRANSACTION NEEDED)
// --------------------------------------------------------
export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      supplierProfile: true,
      distributorProfile: true,
    },
  });

  if (!user) throw new ResponseError("Invalid Credentials", 401);
  if (!(await bcrypt.compare(password, user.password)))
    throw new ResponseError("Invalid Credentials", 401);

  return user;
}

// --------------------------------------------------------
// 🟨 REGISTER USER (USE TRANSACTION)
// --------------------------------------------------------
export async function registerUser({ name, email, password }) {
  // Check if already registered
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new ResponseError("User already exists", 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  console.log(otp);

  // Transaction ensures: delete old pending + create new pending is atomic
  await prisma.$transaction(async (tx) => {
    // Delete old pending entry if exists
    await tx.pendingUser.deleteMany({ where: { email } });

    // Create new pending entry
    await tx.pendingUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        otp,
        otpExpiry,
      },
    });
  });

  await sendOtpEmail(email, otp);

  return { message: "OTP sent to email" };
}

// --------------------------------------------------------
// 🟩 VERIFY OTP (STRONG TRANSACTION REQUIRED)
// --------------------------------------------------------
export async function verifyOtp({ email, otp }) {
  const pendingUser = await prisma.pendingUser.findUnique({ where: { email } });
  if (!pendingUser) throw new ResponseError("No pending user found", 404);

  // Check expiry first
  if (new Date() > pendingUser.otpExpiry) {
    await prisma.pendingUser.delete({ where: { email } });
    throw new ResponseError("OTP expired. Please register again.", 401);
  }

  // Timing-safe OTP comparison to prevent timing attacks
  const otpBuffer = Buffer.from(otp.padEnd(6, "0"));
  const storedOtpBuffer = Buffer.from(pendingUser.otp.padEnd(6, "0"));
  const isValidOtp = crypto.timingSafeEqual(otpBuffer, storedOtpBuffer);

  if (!isValidOtp) throw new ResponseError("Invalid OTP", 401);

  // Transaction ensures atomic user creation + pending cleanup
  // New users default to CUSTOMER role (single role per account)
  const newUser = await prisma.$transaction(async (tx) => {
    // Create main user with default CUSTOMER role
    const createdUser = await tx.user.create({
      data: {
        name: pendingUser.name,
        email: pendingUser.email,
        password: pendingUser.password,
        role: "CUSTOMER", // Default role - single role per account
      },
    });

    // Delete pending entry
    await tx.pendingUser.delete({
      where: { email },
    });

    return createdUser;
  });

  return newUser;
}
