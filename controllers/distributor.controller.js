import * as distributorService from "../services/distributor.service.js";
import * as orderLegService from "../services/orderLeg.service.js";
import ResponseError from "../utils/customError.js";

// =====================================================
// PROFILE
// =====================================================

// 🟦 Get my profile
export async function getMyProfile(req, res, next) {
  try {
    const profile = await distributorService.getMyProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

// 🟧 Update my profile
export async function updateMyProfile(req, res, next) {
  try {
    const profile = await distributorService.updateMyProfile(
      req.user.id,
      req.body
    );
    res.json({ message: "Profile updated", profile });
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
    const transporter = await distributorService.createTransporter(
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
    const transporters = await distributorService.getMyTransporters(
      req.user.id
    );
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

    const transporter = await distributorService.updateTransporter(
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

    await distributorService.deleteTransporter(req.user.id, transporterId);
    res.json({ message: "Transporter deleted" });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// ASSIGNED ORDERS
// =====================================================

// 🟦 Get orders assigned to me
export async function getAssignedOrders(req, res, next) {
  try {
    const orders = await distributorService.getAssignedOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// 🟦 Get orders I'm currently holding
export async function getHeldOrders(req, res, next) {
  try {
    const orders = await distributorService.getHeldOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// 🟦 Get all other distributors (to forward orders)
export async function getAllDistributors(req, res, next) {
  try {
    const distributors = await distributorService.getAllDistributors(
      req.user.id
    );
    res.json(distributors);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// ORDER LEG ACTIONS
// =====================================================

// 🟧 Accept delivery
export async function acceptDelivery(req, res, next) {
  try {
    const legId = parseInt(req.params.legId);
    if (isNaN(legId)) throw new ResponseError("Invalid leg ID", 400);

    const leg = await orderLegService.acceptLeg(
      legId,
      req.user.distributorProfileId
    );
    res.json({ message: "Delivery accepted", leg });
  } catch (err) {
    next(err);
  }
}

// 🟧 Reject delivery
export async function rejectDelivery(req, res, next) {
  try {
    const legId = parseInt(req.params.legId);
    if (isNaN(legId)) throw new ResponseError("Invalid leg ID", 400);

    const { reason } = req.body;
    const leg = await orderLegService.rejectLeg(
      legId,
      req.user.distributorProfileId,
      reason
    );
    res.json({ message: "Delivery rejected", leg });
  } catch (err) {
    next(err);
  }
}

// 🟧 Confirm receipt (I received the goods)
export async function confirmReceipt(req, res, next) {
  try {
    const legId = parseInt(req.params.legId);
    if (isNaN(legId)) throw new ResponseError("Invalid leg ID", 400);

    const leg = await orderLegService.confirmReceipt(
      legId,
      req.user.distributorProfileId
    );
    res.json({ message: "Receipt confirmed", leg });
  } catch (err) {
    next(err);
  }
}

// 🟩 Forward order (create next leg)
export async function forwardOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const leg = await orderLegService.forwardOrder(
      orderId,
      req.user.distributorProfileId,
      req.body
    );
    res.status(201).json({ message: "Order forwarded", leg });
  } catch (err) {
    next(err);
  }
}

// 🟧 Reassign rejected leg
export async function reassignLeg(req, res, next) {
  try {
    const legId = parseInt(req.params.legId);
    if (isNaN(legId)) throw new ResponseError("Invalid leg ID", 400);

    const { toDistributorId, transporterId } = req.body;
    if (!toDistributorId || !transporterId) {
      throw new ResponseError("toDistributorId and transporterId are required", 400);
    }

    const leg = await orderLegService.reassignDistributorLeg(
      legId,
      req.user.distributorProfileId,
      parseInt(toDistributorId),
      parseInt(transporterId)
    );
    res.json({ message: "Leg reassigned successfully", leg });
  } catch (err) {
    next(err);
  }
}

// 🟧 Ship forward (mark leg as in-transit)
export async function shipForward(req, res, next) {
  try {
    const legId = parseInt(req.params.legId);
    if (isNaN(legId)) throw new ResponseError("Invalid leg ID", 400);

    const leg = await orderLegService.shipForward(
      legId,
      req.user.distributorProfileId
    );
    res.json({ message: "Shipped", leg });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// ADMIN
// =====================================================

// 🟦 Get all distributors (admin only)
export async function getAllDistributorsAdmin(req, res, next) {
  try {
    const distributors = await distributorService.getAllDistributorsAdmin();
    res.json(distributors);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// LEG TRACKING
// =====================================================

// 🟦 Get all legs I've sent out
export async function getOutgoingLegs(req, res, next) {
  try {
    const legs = await distributorService.getOutgoingLegs(req.user.id);
    res.json(legs);
  } catch (err) {
    next(err);
  }
}

// 🟦 Get specific leg by ID
export async function getLegById(req, res, next) {
  try {
    const legId = parseInt(req.params.legId);
    if (isNaN(legId)) throw new ResponseError("Invalid leg ID", 400);

    const leg = await distributorService.getLegById(req.user.id, legId);
    res.json(leg);
  } catch (err) {
    next(err);
  }
}
