import express from "express";
import * as productController from "../controllers/product.controller.js";
import { authorizeRoles } from "../middlewares/validate.user.middleware.js";

const router = express.Router();

// Supplier Routes
router.use(authorizeRoles("SUPPLIER"));

// Supplier-only actions
router.post("/", productController.createProduct);
router.get("/me", productController.getMyProducts);
router.put("/me/:id", productController.updateMyProduct);
router.delete("/me/:id", productController.deleteMyProduct);

// Admin-only actions
router.use(authorizeRoles("ADMIN"));
router.get("/all", productController.getAllProducts);

export default router;
