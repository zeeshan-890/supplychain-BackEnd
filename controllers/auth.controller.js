import * as authService from "../services/auth.service.js";
import ResponseError from "../utils/customError.js";
import {
  pendingUserSchema,
  loginSchema,
  otpSchema,
} from "../utils/validation.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export async function registerUser(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      throw new ResponseError("Required fields not filled.", 400);

    const { error } = pendingUserSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const normalizedEmail = email.toLowerCase().trim();

    const response = await authService.registerUser({
      name,
      email: normalizedEmail,
      password,
    });

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function loginUser(req, res, next) {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const user = await authService.loginUser({
      email: normalizedEmail,
      password,
    });

    // Create JWT with single role
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        // Include profile IDs if they exist
        supplierProfileId: user.supplierProfile?.id || null,
        distributorProfileId: user.distributorProfile?.id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasSupplierProfile: !!user.supplierProfile,
        hasDistributorProfile: !!user.distributorProfile,
      },
    });
  } catch (err) {
    next(err);
  }
}

export const logoutUser = (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json("Logout Successful");
};

export async function verifyOtp(req, res, next) {
  try {
    const { error } = otpSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await authService.verifyOtp({ email: normalizedEmail, otp });
    res.status(201).json({ message: "User verified successfully", user });
  } catch (err) {
    next(err);
  }
}

// Get current user info
export async function getCurrentUser(req, res, next) {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      supplierProfileId: user.supplierProfileId,
      distributorProfileId: user.distributorProfileId,
    });
  } catch (err) {
    next(err);
  }
}
