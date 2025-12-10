import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

// Authentication middleware - validates JWT token
export const authenticateUser = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
};

// Alias for backwards compatibility
export const validateUserMiddleware = authenticateUser;

// Authorize based on single role (user.role)
// Also supports X-Active-Role header for multi-role users
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    // Check for active role header (for users with multiple roles)
    const activeRole = req.headers['x-active-role'];
    let effectiveRole = user.role;

    // If user has an active role header, validate and use it
    if (activeRole) {
      // Validate that user can use this role
      const canUseRole =
        activeRole === 'CUSTOMER' || // Everyone can be a customer
        (activeRole === 'SUPPLIER' && user.supplierProfileId) ||
        (activeRole === 'DISTRIBUTOR' && user.distributorProfileId) ||
        (activeRole === 'ADMIN' && user.role === 'ADMIN');

      if (canUseRole) {
        effectiveRole = activeRole;
      }
    }

    // Check if user's effective role is in the allowed roles
    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(
          ", "
        )}. Your role: ${effectiveRole || "none"}`,
      });
    }

    // Store effective role in request for use in controllers
    req.effectiveRole = effectiveRole;

    next();
  };
}
