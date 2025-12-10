import Joi from "joi";

// =====================================================
// AUTH & USER SCHEMAS
// =====================================================

export const userSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number."
    )
    .required(),
  picture: Joi.string().uri().optional(),
}).unknown(false);

export const pendingUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number."
    )
    .required(),
}).unknown(false);

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
  activeRole: Joi.string()
    .valid("ADMIN", "SUPPLIER", "DISTRIBUTOR", "RETAILER", "CUSTOMER")
    .optional(),
}).unknown(false);

export const switchRoleSchema = Joi.object({
  role: Joi.string()
    .valid("ADMIN", "SUPPLIER", "DISTRIBUTOR", "RETAILER", "CUSTOMER")
    .required(),
}).unknown(false);

export const userUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number."
    )
    .optional(),
  picture: Joi.string().uri().optional(),
  phone: Joi.string().trim().min(10).max(15).optional(),
  address: Joi.string().trim().max(200).optional(),
}).unknown(false);

export const otpSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .message("OTP must be exactly 6 digits")
    .required(),
}).unknown(false);

// =====================================================
// ROLE REQUEST SCHEMAS
// =====================================================

export const roleRequestSchema = Joi.object({
  requestedRole: Joi.string().valid("SUPPLIER", "DISTRIBUTOR").required(),
  businessName: Joi.string().trim().min(2).max(100).required(),
  businessAddress: Joi.string().trim().min(5).max(200).required(),
  contactNumber: Joi.string()
    .pattern(/^[0-9+\-\s]{10,15}$/)
    .message(
      "Contact number must be 10-15 digits and may include +, -, or spaces"
    )
    .required(),
  NTN: Joi.string().trim().max(20).allow(null, "").optional(),
}).unknown(false);

export const updateRoleStatusSchema = Joi.object({
  status: Joi.string().valid("PENDING", "APPROVED", "REJECTED").required(),
}).unknown(false);

// =====================================================
// PRODUCT SCHEMAS
// =====================================================

export const productSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string().trim().min(2).max(100).required(),
  batchNo: Joi.string().trim().min(1).max(100).required(),
  qrCode: Joi.string().trim().max(255).optional(),
  description: Joi.string().trim().max(500).optional(),
  price: Joi.number().positive().precision(2).required(),
}).unknown(false);

export const productUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  category: Joi.string().trim().min(2).max(100).optional(),
  batchNo: Joi.string().trim().min(1).max(100).optional(),
  qrCode: Joi.string().trim().max(255).optional(),
  description: Joi.string().trim().max(500).optional(),
  price: Joi.number().positive().precision(2).optional(),
}).unknown(false);

// =====================================================
// INVENTORY SCHEMAS
// =====================================================

export const addInventorySchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
}).unknown(false);

export const updateInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).required(),
}).unknown(false);

export const getStoreQuerySchema = Joi.object({
  role: Joi.string().valid("SUPPLIER", "DISTRIBUTOR", "RETAILER").required(),
}).unknown(false);

// =====================================================
// ORDER SCHEMAS
// =====================================================

export const createOrderSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  inventoryId: Joi.number().integer().positive().required(),
  sellerId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
  deliveryAddress: Joi.string().trim().min(10).max(300).required(),
}).unknown(false);

export const processOrderSchema = Joi.object({
  action: Joi.string().valid("APPROVE", "REJECT").required(),
}).unknown(false);

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PROCESSING", "IN_TRANSIT", "CANCELLED", "RETURNED")
    .required(),
  transporterId: Joi.number().integer().positive().when("status", {
    is: "IN_TRANSIT",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  description: Joi.string().trim().max(255).optional(),
}).unknown(false);

export const confirmDeliverySchema = Joi.object({
  action: Joi.string().valid("CONFIRM", "REJECT").required(),
}).unknown(false);

// =====================================================
// TRANSPORTER SCHEMAS
// =====================================================

export const transporterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s]{10,15}$/)
    .message("Phone must be 10-15 digits and may include +, -, or spaces")
    .required(),
}).unknown(false);

export const transporterUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s]{10,15}$/)
    .message("Phone must be 10-15 digits and may include +, -, or spaces")
    .optional(),
}).unknown(false);

// =====================================================
// TRACKING EVENT SCHEMAS
// =====================================================

export const trackingEventSchema = Joi.object({
  description: Joi.string().trim().min(1).max(255).required(),
}).unknown(false);

// =====================================================
// COMMON PARAM VALIDATORS
// =====================================================

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
}).unknown(true);

export const orderIdParamSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
}).unknown(true);
