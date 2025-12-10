import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as verificationController from "../controllers/verification.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// =====================================================
// CUSTOMER VERIFICATION
// =====================================================
// Verify QR token (customer scans QR code on package)
router.get(
  "/",
  authorizeRoles("CUSTOMER", "ADMIN"),
  verificationController.verifyQrToken
);

// =====================================================
// SUPPLIER - GET QR DETAILS
// =====================================================
// Get QR details for an order (to print/attach to package)
router.get(
  "/order/:id/qr",
  authorizeRoles("SUPPLIER"),
  verificationController.getOrderQrDetails
);

export default router;
