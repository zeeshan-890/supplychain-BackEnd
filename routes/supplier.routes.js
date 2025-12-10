import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as supplierController from "../controllers/supplier.controller.js";

const router = Router();

// All routes require authentication + SUPPLIER role
router.use(authenticateUser, authorizeRoles("SUPPLIER"));

// =====================================================
// PROFILE
// =====================================================
router.get("/profile", supplierController.getMyProfile);
router.put("/profile", supplierController.updateMyProfile);

// =====================================================
// WAREHOUSE
// =====================================================
router.put("/warehouse", supplierController.updateWarehouse);

// =====================================================
// PRODUCTS
// =====================================================
router.get("/products", supplierController.getMyProducts);
router.post("/products", supplierController.createProduct);
router.put("/products/:id", supplierController.updateProduct);
router.delete("/products/:id", supplierController.deleteProduct);

// =====================================================
// INVENTORY
// =====================================================
router.get("/inventory", supplierController.getMyInventory);
router.post("/inventory", supplierController.addToInventory);
router.put("/inventory/:id", supplierController.updateInventory);
router.delete("/inventory/:id", supplierController.removeFromInventory);

// =====================================================
// TRANSPORTERS
// =====================================================
router.get("/transporters", supplierController.getMyTransporters);
router.post("/transporters", supplierController.createTransporter);
router.put("/transporters/:id", supplierController.updateTransporter);
router.delete("/transporters/:id", supplierController.deleteTransporter);

// =====================================================
// ORDERS (supplier viewing their incoming orders)
// =====================================================
router.get("/orders", supplierController.getMyOrders);

// =====================================================
// BROWSE
// =====================================================
router.get("/distributors", supplierController.getAllDistributors);
router.get("/suppliers", supplierController.getAllSuppliers);

export default router;
