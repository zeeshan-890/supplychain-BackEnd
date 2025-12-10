import express from "express";
import * as trackingEventController from "../controllers/tracking.event.controller.js";
import { authorizeRoles } from "../middlewares/validate.user.middleware.js";

const router = express.Router();

// // 🟩 Add tracking event to an order (seller only)
// router.post(
//   "/:orderId/tracking",
//   authorizeRoles("SUPPLIER", "DISTRIBUTOR", "RETAILER"),
//   trackingEventController.addTrackingEvent
// );

// 🟦 Get tracking events for an order (buyer or seller)
router.get(
  "/:orderId/tracking",
  authorizeRoles("SUPPLIER", "DISTRIBUTOR", "RETAILER", "CUSTOMER"),
  trackingEventController.getTrackingEvents
);

export default router;
