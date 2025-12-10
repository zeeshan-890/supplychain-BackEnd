import * as supplierService from "../services/supplier.service.js";
import ResponseError from "../utils/customError.js";

// =====================================================
// PROFILE
// =====================================================

// 🟦 Get my profile
export async function getMyProfile(req, res, next) {
  try {
    const profile = await supplierService.getMyProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// 🟧 Update my profile
export async function updateMyProfile(req, res, next) {
  try {
    const profile = await supplierService.updateMyProfile(
      req.user.id,
      req.body
    );
    res.json({ message: "Profile updated", profile });
  } catch (err) {
    next(err);
  }
}

// 🟧 Update warehouse
export async function updateWarehouse(req, res, next) {
  try {
    const warehouse = await supplierService.updateWarehouse(
      req.user.id,
      req.body
    );
    res.json({ message: "Warehouse updated", warehouse });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// PRODUCTS
// =====================================================

// 🟩 Create product
export async function createProduct(req, res, next) {
  try {
    const product = await supplierService.createProduct(req.user.id, req.body);
    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get my products
export async function getMyProducts(req, res, next) {
  try {
    const products = await supplierService.getMyProducts(req.user.id);
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// 🟧 Update product
export async function updateProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) throw new ResponseError("Invalid product ID", 400);

    const product = await supplierService.updateProduct(
      req.user.id,
      productId,
      req.body
    );
    res.json({ message: "Product updated", product });
  } catch (err) {
    next(err);
  }
}

// ⬛ Delete product
export async function deleteProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) throw new ResponseError("Invalid product ID", 400);

    await supplierService.deleteProduct(req.user.id, productId);
    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// INVENTORY
// =====================================================

// 🟩 Add to inventory
export async function addToInventory(req, res, next) {
  try {
    const inventory = await supplierService.addToInventory(
      req.user.id,
      req.body
    );
    res.status(201).json({ message: "Added to inventory", inventory });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get my inventory
export async function getMyInventory(req, res, next) {
  try {
    const inventory = await supplierService.getMyInventory(req.user.id);
    res.json(inventory);
  } catch (err) {
    next(err);
  }
}

// 🟧 Update inventory
export async function updateInventory(req, res, next) {
  try {
    const inventoryId = parseInt(req.params.id);
    if (isNaN(inventoryId))
      throw new ResponseError("Invalid inventory ID", 400);

    const { quantity } = req.body;
    if (quantity === undefined)
      throw new ResponseError("Quantity required", 400);

    const inventory = await supplierService.updateInventory(
      req.user.id,
      inventoryId,
      quantity
    );
    res.json({ message: "Inventory updated", inventory });
  } catch (err) {
    next(err);
  }
}

// ⬛ Remove from inventory
export async function removeFromInventory(req, res, next) {
  try {
    const inventoryId = parseInt(req.params.id);
    if (isNaN(inventoryId))
      throw new ResponseError("Invalid inventory ID", 400);

    await supplierService.removeFromInventory(req.user.id, inventoryId);
    res.json({ message: "Removed from inventory" });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// TRANSPORTERS
// =====================================================

// 🟩 Create transporter
export async function createTransporter(req, res, next) {
  try {
    const transporter = await supplierService.createTransporter(
      req.user.id,
      req.body
    );
    res.status(201).json({ message: "Transporter created", transporter });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get my transporters
export async function getMyTransporters(req, res, next) {
  try {
    const transporters = await supplierService.getMyTransporters(req.user.id);
    res.json(transporters);
  } catch (err) {
    next(err);
  }
}

// 🟧 Update transporter
export async function updateTransporter(req, res, next) {
  try {
    const transporterId = parseInt(req.params.id);
    if (isNaN(transporterId))
      throw new ResponseError("Invalid transporter ID", 400);

    const transporter = await supplierService.updateTransporter(
      req.user.id,
      transporterId,
      req.body
    );
    res.json({ message: "Transporter updated", transporter });
  } catch (err) {
    next(err);
  }
}

// ⬛ Delete transporter
export async function deleteTransporter(req, res, next) {
  try {
    const transporterId = parseInt(req.params.id);
    if (isNaN(transporterId))
      throw new ResponseError("Invalid transporter ID", 400);

    await supplierService.deleteTransporter(req.user.id, transporterId);
    res.json({ message: "Transporter deleted" });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// ORDERS
// =====================================================

// 🟦 Get my orders (received as supplier)
export async function getMyOrders(req, res, next) {
  try {
    const orders = await supplierService.getMyOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// 🟦 Get all distributors (to assign orders)
export async function getAllDistributors(req, res, next) {
  try {
    const distributors = await supplierService.getAllDistributors();
    res.json(distributors);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// ADMIN
// =====================================================

// 🟦 Get all suppliers (admin only)
export async function getAllSuppliers(req, res, next) {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
}
