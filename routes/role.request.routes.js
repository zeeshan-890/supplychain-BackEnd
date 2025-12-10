import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as roleRequestController from "../controllers/role.request.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// =====================================================
// CUSTOMER ROUTES (customers can request SUPPLIER/DISTRIBUTOR)
// =====================================================
// Create a new role request
router.post(
  "/",
  authorizeRoles("CUSTOMER"),
  roleRequestController.createRoleRequest
);

// Get my role requests
router.get(
  "/me",
  authorizeRoles("CUSTOMER", "SUPPLIER", "DISTRIBUTOR"),
  roleRequestController.getMyRoleRequests
);

// =====================================================
// ADMIN ROUTES
// =====================================================
// Get all role requests
router.get(
  "/all",
  authorizeRoles("ADMIN"),
  roleRequestController.getAllRoleRequests
);

// Get pending role requests
router.get(
  "/pending",
  authorizeRoles("ADMIN"),
  roleRequestController.getPendingRoleRequests
);

// Get a request by ID
router.get(
  "/:id",
  authorizeRoles("ADMIN"),
  roleRequestController.getRoleRequestById
);

// Approve / Reject a request
router.patch(
  "/:id/status",
  authorizeRoles("ADMIN"),
  roleRequestController.updateRoleRequestStatus
);

// Delete a request
router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  roleRequestController.deleteRoleRequest
);

export default router;
