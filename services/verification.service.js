import prisma from "../config/database.js";
import ResponseError from "../utils/customError.js";
import {
  parseQrToken,
  computeOrderHash,
  verifySignature,
  getServerPublicKey,
} from "../utils/crypto.js";

/**
 * Verify QR token and return order authenticity status
 * @param {string} token - QR token from URL
 * @param {number} customerId - Logged-in user's ID
 * @returns {object} Verification result
 */
export async function verifyQrToken(token, customerId) {
  // Step 1: Parse the token
  const tokenData = parseQrToken(token);

  if (!tokenData) {
    return {
      valid: false,
      error: "INVALID_TOKEN",
      message: "The QR code is invalid or corrupted.",
    };
  }

  const { orderId, supplierSignature, serverSignature } = tokenData;

  // Step 2: Fetch the order with supplier's public key
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      customer: { select: { id: true, name: true, email: true } },
      supplier: {
        select: {
          id: true,
          businessName: true,
          contactNumber: true,
          publicKey: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!order) {
    return {
      valid: false,
      error: "ORDER_NOT_FOUND",
      message: "Order not found. This QR code may be fake.",
    };
  }

  // Step 3: Verify customer ownership
  if (order.customerId !== customerId) {
    return {
      valid: false,
      error: "NOT_YOUR_ORDER",
      message: "This order does not belong to you.",
    };
  }

  // Step 4: Check if order was signed
  if (!order.supplierSignature || !order.serverSignature) {
    return {
      valid: false,
      error: "NOT_SIGNED",
      message: "This order was not digitally signed.",
    };
  }

  // Step 5: Recompute order hash
  const recomputedHash = computeOrderHash(order);

  // Step 6: Verify supplier signature
  const supplierPublicKey = order.supplier.publicKey;

  if (!supplierPublicKey) {
    return {
      valid: false,
      error: "NO_PUBLIC_KEY",
      message: "Supplier public key not found. Cannot verify.",
    };
  }

  const supplierSigValid = verifySignature(
    recomputedHash,
    supplierSignature,
    supplierPublicKey
  );

  if (!supplierSigValid) {
    return {
      valid: false,
      error: "SUPPLIER_SIGNATURE_INVALID",
      message:
        "⚠️ WARNING: Order data has been TAMPERED with! Supplier signature verification failed.",
      tamperedFields: "Order content may have been modified.",
    };
  }

  // Step 7: Verify server signature
  const serverPublicKey = getServerPublicKey();
  const serverSigValid = verifySignature(
    supplierSignature,
    serverSignature,
    serverPublicKey
  );

  if (!serverSigValid) {
    return {
      valid: false,
      error: "SERVER_SIGNATURE_INVALID",
      message:
        "⚠️ WARNING: Server signature verification failed. This may be a forged QR code.",
    };
  }

  // Step 8: Compare signatures from token with stored signatures
  if (supplierSignature !== order.supplierSignature) {
    return {
      valid: false,
      error: "SIGNATURE_MISMATCH",
      message:
        "⚠️ WARNING: QR signature does not match stored signature. Possible tampering detected.",
    };
  }

  // Step 9: Auto-mark order as DELIVERED if not already delivered
  if (order.status !== "DELIVERED") {
    await prisma.$transaction(async (tx) => {
      // Update order status to DELIVERED
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      });

      // Get the last leg (if exists) and mark it as DELIVERED
      const lastLeg = await tx.orderLeg.findFirst({
        where: { orderId },
        orderBy: { legNumber: "desc" },
      });

      if (lastLeg && lastLeg.status !== "DELIVERED") {
        await tx.orderLeg.update({
          where: { id: lastLeg.id },
          data: { status: "DELIVERED" },
        });

        // Create tracking event for delivery confirmation
        await tx.trackingEvent.create({
          data: {
            orderId,
            legId: lastLeg.id,
            fromUserId: customerId,
            toUserId: order.supplier.user.id,
            status: "DELIVERED",
            description: "Order delivered and verified by customer via QR code",
          },
        });
      }
    });
  }

  // All checks passed!
  return {
    valid: true,
    message:
      "✅ AUTHENTIC ORDER - Original Supplier Packaging Verified & Delivered",
    order: {
      id: order.id,
      product: {
        name: order.product.name,
        category: order.product.category,
        batchNo: order.product.batchNo,
      },
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      supplier: {
        name: order.supplier.businessName,
        contact: order.supplier.contactNumber,
      },
      orderDate: order.orderDate,
      signedAt: order.signedAt,
      status: "DELIVERED",
    },
  };
}

/**
 * Get order QR details for supplier (to print/attach to package)
 * @param {number} orderId
 * @param {number} supplierId
 * @returns {object} QR details
 */
export async function getOrderQrDetails(orderId, supplierId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      customer: { select: { name: true } },
    },
  });

  if (!order) throw new ResponseError("Order not found", 404);
  if (order.supplierId !== supplierId) {
    throw new ResponseError("This order is not yours", 403);
  }

  if (!order.qrToken) {
    throw new ResponseError("Order has not been signed yet", 400);
  }

  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationUrl = `${baseUrl}/verify?token=${order.qrToken}`;

  return {
    orderId: order.id,
    productName: order.product.name,
    customerName: order.customer.name,
    quantity: order.quantity,
    qrToken: order.qrToken,
    verificationUrl,
    signedAt: order.signedAt,
  };
}
