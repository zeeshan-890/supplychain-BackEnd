import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as distributorController from "../controllers/distributor.controller.js";

const router = Router();

// All routes require authentication + DISTRIBUTOR role
router.use(authenticateUser, authorizeRoles("DISTRIBUTOR"));

// =====================================================
// PROFILE
// =====================================================
router.get("/profile", distributorController.getMyProfile);
router.put("/profile", distributorController.updateMyProfile);

// =====================================================
// TRANSPORTERS
// =====================================================
router.get("/transporters", distributorController.getMyTransporters);
router.post("/transporters", distributorController.createTransporter);
router.put("/transporters/:id", distributorController.updateTransporter);
router.delete("/transporters/:id", distributorController.deleteTransporter);

// =====================================================
// ORDERS (assigned to this distributor)
// =====================================================
router.get("/orders/assigned", distributorController.getAssignedOrders);
router.get("/orders/held", distributorController.getHeldOrders);

// =====================================================
// ORDER LEG ACTIONS
// =====================================================
// Accept an incoming delivery assignment
router.post("/legs/:legId/accept", distributorController.acceptDelivery);

// Reject an incoming delivery assignment
router.post("/legs/:legId/reject", distributorController.rejectDelivery);

// Confirm receipt of goods (leg delivered to me)
router.post(
  "/legs/:legId/confirm-receipt",
  distributorController.confirmReceipt
);

// Ship a leg (mark as in-transit)
router.post("/legs/:legId/ship", distributorController.shipForward);

// Forward to another distributor or to customer
router.post("/orders/:orderId/forward", distributorController.forwardOrder);

// Reassign a rejected leg to a different distributor
router.post("/legs/:legId/reassign", distributorController.reassignLeg);

// =====================================================
// LEG TRACKING
// =====================================================
// Get all legs I've sent out (outgoing)
router.get("/legs/outgoing", distributorController.getOutgoingLegs);

// Get specific leg details by ID
router.get("/legs/:legId", distributorController.getLegById);

// =====================================================
// BROWSE
// =====================================================
router.get("/distributors", distributorController.getAllDistributors);

export default router;
