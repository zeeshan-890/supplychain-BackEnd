import { Router } from "express";
import {
  registerUser,
  verifyOtp,
  loginUser,
  logoutUser,
  getCurrentUser,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/validate.user.middleware.js";
import {
  authLimiter,
  otpLimiter,
} from "../middlewares/rateLimit.middleware.js";

const router = Router();

// Apply rate limiting to sensitive auth routes
router.post("/register", otpLimiter, registerUser);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/login", authLimiter, loginUser);
router.post("/logout", logoutUser);

// Protected routes
router.get("/me", authenticateUser, getCurrentUser);

export default router;
