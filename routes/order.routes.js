import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// =====================================================
// PUBLIC / BROWSE
// =====================================================
// Anyone authenticated can browse available products
router.get("/products", orderController.getAvailableProducts);

// =====================================================
// CUSTOMER ROUTES
// =====================================================
// Create order (customer places an order from a supplier)
router.post("/", authorizeRoles("CUSTOMER"), orderController.createOrder);

// Get my orders (as customer)
router.get(
  "/my-orders",
  authorizeRoles("CUSTOMER"),
  orderController.getMyOrders
);

// Cancel order
router.post(
  "/:id/cancel",
  authorizeRoles("CUSTOMER"),
  orderController.cancelOrder
);

// Confirm delivery (final leg delivered)
router.post(
  "/:id/confirm-delivery",
  authorizeRoles("CUSTOMER"),
  orderController.confirmDelivery
);

// Get order by ID (customer can view their own orders)
router.get(
  "/:id",
  authorizeRoles("CUSTOMER", "SUPPLIER", "DISTRIBUTOR", "ADMIN"),
  orderController.getOrderById
);

// =====================================================
// SUPPLIER ROUTES (for order processing)
// =====================================================
// Approve order (assign distributor and transporter)
router.post(
  "/:id/approve",
  authorizeRoles("SUPPLIER"),
  orderController.approveOrder
);

// Reject order
router.post(
  "/:id/reject",
  authorizeRoles("SUPPLIER"),
  orderController.rejectOrder
);

// Reassign order (pick new distributor after rejection)
router.post(
  "/:id/reassign",
  authorizeRoles("SUPPLIER"),
  orderController.reassignOrder
);

// Ship order (mark leg as in-transit)
router.post(
  "/:id/legs/:legId/ship",
  authorizeRoles("SUPPLIER"),
  orderController.shipOrder
);

export default router;
