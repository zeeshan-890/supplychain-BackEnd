import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as userController from "../controllers/user.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// =====================================================
// USER ROUTES (self-management)
// =====================================================
router.get(
  "/",
  authorizeRoles("ADMIN", "SUPPLIER", "DISTRIBUTOR", "CUSTOMER"),
  userController.getUserByEmail
);

router.put(
  "/",
  authorizeRoles("ADMIN", "SUPPLIER", "DISTRIBUTOR", "CUSTOMER"),
  userController.updateUser
);

router.delete(
  "/",
  authorizeRoles("ADMIN", "SUPPLIER", "DISTRIBUTOR", "CUSTOMER"),
  userController.deleteUser
);

// =====================================================
// ADMIN ROUTES
// =====================================================
router.get("/all", authorizeRoles("ADMIN"), userController.getAllUsers);

export default router;
