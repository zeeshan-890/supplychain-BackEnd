import * as orderService from "../services/order.service.js";
import ResponseError from "../utils/customError.js";

// =====================================================
// PUBLIC / BROWSE
// =====================================================

// 🟦 Get all available products (from suppliers)
export async function getAvailableProducts(req, res, next) {
  try {
    const products = await orderService.getAvailableProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// CUSTOMER ACTIONS
// =====================================================

// 🟩 Create order
export async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    res.status(201).json({ message: "Order placed", order });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get my orders (as customer)
export async function getMyOrders(req, res, next) {
  try {
    const orders = await orderService.getMyOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// 🟧 Cancel order
export async function cancelOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const order = await orderService.cancelOrder(orderId, req.user.id);
    res.json({ message: "Order cancelled", order });
  } catch (err) {
    next(err);
  }
}

// 🟧 Confirm delivery
export async function confirmDelivery(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const order = await orderService.confirmDelivery(orderId, req.user.id);
    res.json({ message: "Delivery confirmed", order });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get order by ID
export async function getOrderById(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const order = await orderService.getOrderById(orderId, req.user.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// SUPPLIER ACTIONS
// =====================================================

// 🟧 Approve order (and assign distributor)
export async function approveOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const supplierProfileId = req.user.supplierProfileId;
    if (!supplierProfileId) {
      throw new ResponseError("Supplier profile not found", 404);
    }

    const result = await orderService.approveOrder(
      orderId,
      supplierProfileId,
      req.body
    );
    res.json({ message: "Order approved", ...result });
  } catch (err) {
    next(err);
  }
}

// 🟧 Reject order
export async function rejectOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const supplierProfileId = req.user.supplierProfileId;
    if (!supplierProfileId) {
      throw new ResponseError("Supplier profile not found", 404);
    }

    const { reason } = req.body;
    const order = await orderService.rejectOrder(
      orderId,
      supplierProfileId,
      reason
    );
    res.json({ message: "Order rejected", order });
  } catch (err) {
    next(err);
  }
}

// 🟧 Ship order (mark leg as in-transit)
export async function shipOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    const legId = parseInt(req.params.legId);
    if (isNaN(orderId) || isNaN(legId)) {
      throw new ResponseError("Invalid order or leg ID", 400);
    }

    const supplierProfileId = req.user.supplierProfileId;
    if (!supplierProfileId) {
      throw new ResponseError("Supplier profile not found", 404);
    }

    const leg = await orderService.shipOrder(orderId, supplierProfileId, legId);
    res.json({ message: "Order shipped", leg });
  } catch (err) {
    next(err);
  }
}

// 🟧 Reassign order (pick new distributor after rejection)
export async function reassignOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const supplierProfileId = req.user.supplierProfileId;
    if (!supplierProfileId) {
      throw new ResponseError("Supplier profile not found", 404);
    }

    const result = await orderService.reassignOrder(
      orderId,
      supplierProfileId,
      req.body
    );
    res.json({ message: "Order reassigned to new distributor", ...result });
  } catch (err) {
    next(err);
  }
}
