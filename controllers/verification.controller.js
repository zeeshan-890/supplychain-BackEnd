import * as verificationService from "../services/verification.service.js";
import ResponseError from "../utils/customError.js";

/**
 * Verify QR token (Customer scans QR)
 * GET /api/verify?token=...
 */
export async function verifyQrToken(req, res, next) {
  try {
    const { token } = req.query;

    if (!token) {
      throw new ResponseError("Token is required", 400);
    }

    const result = await verificationService.verifyQrToken(token, req.user.id);

    if (result.valid) {
      res.json(result);
    } else {
      // Return 200 but with valid: false so frontend can display the error
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Get QR details for an order (Supplier wants to print QR)
 * GET /api/verify/order/:id/qr
 */
export async function getOrderQrDetails(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) throw new ResponseError("Invalid order ID", 400);

    const supplierProfileId = req.user.supplierProfileId;
    if (!supplierProfileId) {
      throw new ResponseError("Supplier profile not found", 404);
    }

    const qrDetails = await verificationService.getOrderQrDetails(
      orderId,
      supplierProfileId
    );

    res.json(qrDetails);
  } catch (err) {
    next(err);
  }
}
