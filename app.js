import express from "express";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import roleRequestRoutes from "./routes/role.request.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import distributorRoutes from "./routes/distributor.routes.js";
import orderRoutes from "./routes/order.routes.js";
import verificationRoutes from "./routes/verification.routes.js";
import errorHandler from "./middlewares/globalErrorHandler.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";

//Main server instance
const app = express();

/***************** MIDDLEWARES ****************/
//Data format - limit payload size to prevent DoS
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

//Security helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

//CORS --> Restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5173"];

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Active-Role"],
  })
);

//Allow cookies
app.use(cookieParser());

/***************** ROUTING ****************/

// -------> Health Check <--------
app.get("/health-check", apiLimiter, (req, res) => {
  res.status(200).json("OK");
});

// -------> Public Routes <--------
// Auth Routes (register, login, logout, verify-otp)
app.use("/api/auth", authRoutes);

// -------> Protected Routes <--------
// Each route file handles its own authentication via authenticateUser middleware
// User Routes
app.use("/api/user", userRoutes);
// Role Request Routes (customers request SUPPLIER/DISTRIBUTOR, admin approves)
app.use("/api/role-request", roleRequestRoutes);
// Supplier Routes (profile, products, inventory, transporters, orders)
app.use("/api/supplier", supplierRoutes);
// Distributor Routes (profile, transporters, order legs)
app.use("/api/distributor", distributorRoutes);
// Order Routes (customers create, suppliers approve, view)
app.use("/api/order", orderRoutes);
// Verification Routes (QR code verification for customers)
app.use("/api/verify", verificationRoutes);

/***************** ERROR HANDLING ****************/
// Global Error Handler
app.use(errorHandler);

//Export
export default app;
