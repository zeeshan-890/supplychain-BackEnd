# Supply Chain Management System - Backend Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Security Features](#security-features)
- [Setup Instructions](#setup-instructions)

---

## 🎯 Overview

A comprehensive Supply Chain Management System that enables seamless tracking and management of products from suppliers to customers through distributors. The system includes:

- **Multi-Role System**: Admin, Supplier, Distributor, Customer
- **Order Management**: Complete order lifecycle from placement to delivery
- **Product Tracking**: Real-time tracking with QR code verification
- **Digital Signatures**: RSA-based signatures for order authenticity
- **Role-Based Access Control**: Secure endpoints based on user roles

---

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: MySQL (via Prisma ORM)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting, bcrypt
- **Email**: Nodemailer
- **ORM**: Prisma v6.18.0

---

## 📁 Project Structure

```
BackEnd/
├── app.js                      # Express app configuration
├── server.js                   # Server entry point
├── package.json                # Dependencies and scripts
├── prisma.config.ts            # Prisma configuration
├── .env                        # Environment variables
│
├── config/
│   ├── database.js             # Prisma client instance
│   └── nodemailer.js           # Email configuration
│
├── controllers/
│   ├── auth.controller.js      # Authentication logic
│   ├── user.controller.js      # User management
│   ├── role.request.controller.js  # Role requests
│   ├── supplier.controller.js  # Supplier operations
│   ├── distributor.controller.js   # Distributor operations
│   ├── order.controller.js     # Order management
│   └── verification.controller.js  # QR verification
│
├── services/
│   ├── auth.service.js         # Auth business logic
│   ├── user.service.js         # User operations
│   ├── role.request.service.js # Role request logic
│   ├── supplier.service.js     # Supplier business logic
│   ├── distributor.service.js  # Distributor business logic
│   ├── order.service.js        # Order processing
│   ├── orderLeg.service.js     # Order leg management
│   └── verification.service.js # QR verification logic
│
├── routes/
│   ├── auth.routes.js          # Auth endpoints
│   ├── user.routes.js          # User endpoints
│   ├── role.request.routes.js  # Role request endpoints
│   ├── supplier.routes.js      # Supplier endpoints
│   ├── distributor.routes.js   # Distributor endpoints
│   ├── order.routes.js         # Order endpoints
│   ├── verification.routes.js  # Verification endpoints
│   ├── product.routes.js       # Product endpoints (if used)
│   └── tracking.event.routes.js # Tracking endpoints (if used)
│
├── middlewares/
│   ├── globalErrorHandler.js   # Centralized error handling
│   ├── rateLimit.middleware.js # Rate limiting
│   └── validate.user.middleware.js # JWT authentication
│
├── utils/
│   ├── validation.js           # Joi validation schemas
│   ├── customError.js          # Custom error class
│   └── crypto.js               # Cryptographic utilities
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
│
└── scripts/
    └── generateServerKeys.js   # Generate RSA keys for server
```

---

## 🗄 Database Schema

### Enums

#### Role
- `ADMIN` - System administrator
- `SUPPLIER` - Product supplier
- `DISTRIBUTOR` - Logistics distributor
- `CUSTOMER` - End customer

#### RequestStatus
- `PENDING` - Awaiting approval
- `APPROVED` - Request approved
- `REJECTED` - Request rejected

#### OrderStatus
- `PENDING` - Order placed, awaiting supplier approval
- `APPROVED` - Supplier approved, stock deducted
- `PENDING_REASSIGN` - Distributor rejected, needs reassignment
- `IN_PROGRESS` - At least one leg in transit
- `DELIVERED` - Final delivery confirmed
- `CANCELLED` - Cancelled by customer or rejected by supplier

#### LegStatus
- `PENDING` - Awaiting recipient acceptance
- `ACCEPTED` - Recipient agreed to receive
- `IN_TRANSIT` - Currently being shipped
- `DELIVERED` - Recipient confirmed receipt
- `REJECTED` - Recipient declined

#### ParticipantType
- `SUPPLIER` - Supplier participant
- `DISTRIBUTOR` - Distributor participant
- `CUSTOMER` - Customer participant

---

### Models

#### PendingUser
Temporary storage for users during registration (before OTP verification)

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| email | String | Unique email |
| name | String | User's name |
| password | String | Hashed password |
| otp | String | One-time password |
| otpExpiry | DateTime | OTP expiration time |
| createdAt | DateTime | Creation timestamp |

---

#### User
Main user table after verification

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| name | String | User's full name |
| email | String | Unique email |
| password | String | Hashed password |
| picture | String? | Profile picture URL |
| role | Role | User role (default: CUSTOMER) |
| createdAt | DateTime | Account creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `supplierProfile` - SupplierProfile (one-to-one)
- `distributorProfile` - DistributorProfile (one-to-one)
- `roleRequests` - RoleRequest[] (one-to-many)
- `ordersAsCustomer` - Order[] (one-to-many)
- `trackingFrom` - TrackingEvent[] (one-to-many)
- `trackingTo` - TrackingEvent[] (one-to-many)

---

#### RoleRequest
Customer requests to become Supplier or Distributor

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| userId | Int | Foreign key to User |
| requestedRole | Role | SUPPLIER or DISTRIBUTOR |
| status | RequestStatus | PENDING, APPROVED, REJECTED |
| businessName | String | Business name |
| businessAddress | String | Business address |
| contactNumber | String | Contact phone |
| NTN | String? | Tax number (optional) |
| licenseNumber | String? | For suppliers (optional) |
| serviceArea | String? | For distributors (optional) |
| createdAt | DateTime | Request creation time |
| updatedAt | DateTime | Last update time |

---

#### SupplierProfile
Profile for users with SUPPLIER role

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| userId | Int | Foreign key to User (unique) |
| businessName | String | Business name |
| businessAddress | String | Business address |
| contactNumber | String | Contact phone |
| NTN | String? | Tax number |
| licenseNumber | String? | Supplier license |
| publicKey | String? | RSA public key (PEM) |
| privateKeyHash | String? | SHA256 hash of private key |
| createdAt | DateTime | Profile creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `user` - User
- `warehouse` - Warehouse (one-to-one)
- `products` - Product[] (one-to-many)
- `transporters` - Transporter[] (one-to-many)
- `orders` - Order[] (one-to-many)
- `legsAsFrom` - OrderLeg[] (one-to-many)

---

#### Warehouse
Supplier's warehouse for inventory

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| supplierId | Int | Foreign key to SupplierProfile (unique) |
| name | String | Warehouse name |
| address | String | Warehouse address |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `supplier` - SupplierProfile
- `inventories` - Inventory[] (one-to-many)

---

#### DistributorProfile
Profile for users with DISTRIBUTOR role

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| userId | Int | Foreign key to User (unique) |
| businessName | String | Business name |
| businessAddress | String | Business address |
| contactNumber | String | Contact phone |
| NTN | String? | Tax number |
| serviceArea | String? | Service coverage area |
| createdAt | DateTime | Profile creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `user` - User
- `transporters` - Transporter[] (one-to-many)
- `legsAsFrom` - OrderLeg[] (one-to-many)
- `legsAsTo` - OrderLeg[] (one-to-many)

---

#### Product
Products created by suppliers

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| name | String | Product name |
| category | String | Product category |
| batchNo | String | Batch number |
| qrCode | String? | QR code (unique) |
| description | String? | Product description |
| price | Float | Product price |
| supplierId | Int | Foreign key to SupplierProfile |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `supplier` - SupplierProfile
- `inventories` - Inventory[] (one-to-many)
- `orders` - Order[] (one-to-many)

---

#### Inventory
Stock levels in warehouse

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| warehouseId | Int | Foreign key to Warehouse |
| productId | Int | Foreign key to Product |
| quantity | Int | Stock quantity (default: 0) |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update time |

**Unique Constraint:** (warehouseId, productId)

**Relations:**
- `warehouse` - Warehouse
- `product` - Product

---

#### Order
Customer orders from suppliers

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| orderDate | DateTime | Order placement time |
| quantity | Int | Quantity ordered |
| totalAmount | Float | Total order amount |
| status | OrderStatus | Order status |
| deliveryAddress | String | Delivery address |
| orderHash | String? | SHA256 hash for verification |
| supplierSignature | String? | RSA signature by supplier |
| serverSignature | String? | RSA signature by server |
| qrToken | String? | Base64 token for QR |
| signedAt | DateTime? | Signature timestamp |
| customerId | Int | Foreign key to User |
| supplierId | Int | Foreign key to SupplierProfile |
| productId | Int | Foreign key to Product |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `customer` - User
- `supplier` - SupplierProfile
- `product` - Product
- `legs` - OrderLeg[] (one-to-many)
- `trackingEvents` - TrackingEvent[] (one-to-many)

---

#### OrderLeg
Chain of delivery handoffs

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| orderId | Int | Foreign key to Order |
| legNumber | Int | Sequence in chain (1, 2, 3...) |
| status | LegStatus | Leg status |
| fromType | ParticipantType | Sender type |
| fromSupplierId | Int? | If sender is supplier |
| fromDistributorId | Int? | If sender is distributor |
| toType | ParticipantType | Recipient type |
| toDistributorId | Int? | If recipient is distributor |
| transporterId | Int? | Assigned transporter |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update time |

**Unique Constraint:** (orderId, legNumber)

**Relations:**
- `order` - Order
- `fromSupplier` - SupplierProfile
- `fromDistributor` - DistributorProfile
- `toDistributor` - DistributorProfile
- `transporter` - Transporter

---

#### Transporter
Delivery personnel (owned by Supplier or Distributor)

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| name | String | Transporter name |
| phone | String | Contact phone |
| supplierId | Int? | Foreign key to SupplierProfile |
| distributorId | Int? | Foreign key to DistributorProfile |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update time |

**Relations:**
- `supplier` - SupplierProfile
- `distributor` - DistributorProfile
- `orderLegs` - OrderLeg[] (one-to-many)

---

#### TrackingEvent
Complete order history log

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Auto-increment primary key |
| orderId | Int | Foreign key to Order |
| legId | Int? | Related leg (optional) |
| fromUserId | Int? | Sender user |
| toUserId | Int? | Recipient user |
| status | String | Status at this point |
| description | String? | Event description |
| timestamp | DateTime | Event time |

**Relations:**
- `order` - Order
- `fromUser` - User
- `toUser` - User

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```javascript
{
  id: number,              // User ID
  email: string,           // User email
  role: string,            // Current role
  supplierProfileId: number | null,
  distributorProfileId: number | null
}
```

### Cookie Configuration
- **Name**: `token`
- **HttpOnly**: `true`
- **Secure**: `true`
- **SameSite**: `None`
- **MaxAge**: 1 hour (3600000ms)

### Middleware
- `authenticateUser` - Validates JWT token
- `authorizeRoles(...roles)` - Checks if user has required role

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

---

## 1️⃣ Authentication Routes (`/api/auth`)

### POST `/api/auth/register`
Register a new user (sends OTP to email)

**Rate Limited**: 5 requests per 15 minutes

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Pass123"
}
```

**Response:**
```json
{
  "message": "OTP sent to email"
}
```

**Validation:**
- Name: 2-50 characters
- Email: Valid email format
- Password: Min 6 chars, 1 uppercase, 1 lowercase, 1 number

---

### POST `/api/auth/verify-otp`
Verify OTP and create user account

**Rate Limited**: 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "User verified successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER"
  }
}
```

---

### POST `/api/auth/login`
Login user and get JWT token

**Rate Limited**: 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Pass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "hasSupplierProfile": false,
    "hasDistributorProfile": false
  }
}
```

**Cookie Set**: `token` (JWT)

---

### POST `/api/auth/logout`
Logout user (clears token cookie)

**Response:**
```json
"Logout Successful"
```

---

### GET `/api/auth/me`
Get current authenticated user info

**Auth Required**: Yes

**Response:**
```json
{
  "id": 1,
  "email": "john@example.com",
  "role": "CUSTOMER",
  "supplierProfileId": null,
  "distributorProfileId": null
}
```

---

## 2️⃣ User Routes (`/api/user`)

All routes require authentication.

### GET `/api/user/`
Get user by email (self)

**Roles**: ADMIN, SUPPLIER, DISTRIBUTOR, CUSTOMER

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CUSTOMER",
  "picture": null,
  "createdAt": "2024-12-06T10:00:00.000Z",
  "updatedAt": "2024-12-06T10:00:00.000Z"
}
```

---

### PUT `/api/user/`
Update user profile

**Roles**: ADMIN, SUPPLIER, DISTRIBUTOR, CUSTOMER

**Request Body:**
```json
{
  "name": "John Updated",
  "password": "NewPass123",
  "picture": "https://example.com/pic.jpg"
}
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": { ... }
}
```

---

### DELETE `/api/user/`
Delete user account

**Roles**: ADMIN, SUPPLIER, DISTRIBUTOR, CUSTOMER

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

---

### GET `/api/user/all`
Get all users

**Roles**: ADMIN only

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER"
  }
]
```

---

## 3️⃣ Role Request Routes (`/api/role-request`)

### POST `/api/role-request/`
Create role request (Customer → Supplier/Distributor)

**Roles**: CUSTOMER

**Request Body:**
```json
{
  "requestedRole": "SUPPLIER",
  "businessName": "ABC Corp",
  "businessAddress": "123 Main St",
  "contactNumber": "+1234567890",
  "NTN": "12345",
  "licenseNumber": "LIC123"
}
```

**Response:**
```json
{
  "message": "Role request created successfully",
  "request": { ... }
}
```

---

### GET `/api/role-request/me`
Get my role requests

**Roles**: CUSTOMER, SUPPLIER, DISTRIBUTOR

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "requestedRole": "SUPPLIER",
    "status": "PENDING",
    "businessName": "ABC Corp",
    "createdAt": "2024-12-06T10:00:00.000Z"
  }
]
```

---

### GET `/api/role-request/all`
Get all role requests

**Roles**: ADMIN

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "requestedRole": "SUPPLIER",
    "status": "PENDING",
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

---

### GET `/api/role-request/pending`
Get pending role requests

**Roles**: ADMIN

**Response:**
```json
[
  {
    "id": 1,
    "requestedRole": "SUPPLIER",
    "status": "PENDING"
  }
]
```

---

### GET `/api/role-request/:id`
Get role request by ID

**Roles**: ADMIN

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "requestedRole": "SUPPLIER",
  "status": "PENDING",
  "businessName": "ABC Corp"
}
```

---

### PATCH `/api/role-request/:id/status`
Approve or reject role request

**Roles**: ADMIN

**Request Body:**
```json
{
  "status": "APPROVED"
}
```

**Response:**
```json
{
  "message": "Request approved successfully",
  "updatedRequest": { ... }
}
```

**Note**: On APPROVED, creates SupplierProfile or DistributorProfile and updates user role.

---

### DELETE `/api/role-request/:id`
Delete role request

**Roles**: ADMIN

**Response:**
```json
{
  "message": "Role request deleted successfully"
}
```

---

## 4️⃣ Supplier Routes (`/api/supplier`)

All routes require SUPPLIER role.

### GET `/api/supplier/profile`
Get my supplier profile

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "businessName": "ABC Corp",
  "businessAddress": "123 Main St",
  "contactNumber": "+1234567890",
  "NTN": "12345",
  "licenseNumber": "LIC123",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "warehouse": {
    "id": 1,
    "name": "Main Warehouse",
    "address": "456 Storage Ave"
  }
}
```

---

### PUT `/api/supplier/profile`
Update supplier profile

**Request Body:**
```json
{
  "businessName": "Updated Corp",
  "businessAddress": "New Address",
  "contactNumber": "+9876543210"
}
```

**Response:**
```json
{
  "message": "Profile updated",
  "profile": { ... }
}
```

---

### PUT `/api/supplier/warehouse`
Update warehouse details

**Request Body:**
```json
{
  "name": "Central Warehouse",
  "address": "789 Warehouse Rd"
}
```

**Response:**
```json
{
  "message": "Warehouse updated",
  "warehouse": { ... }
}
```

---

### GET `/api/supplier/products`
Get my products

**Response:**
```json
[
  {
    "id": 1,
    "name": "Widget A",
    "category": "Electronics",
    "batchNo": "BATCH001",
    "price": 99.99,
    "description": "High quality widget"
  }
]
```

---

### POST `/api/supplier/products`
Create new product

**Request Body:**
```json
{
  "name": "Widget A",
  "category": "Electronics",
  "batchNo": "BATCH001",
  "price": 99.99,
  "description": "High quality widget",
  "qrCode": "QR123456"
}
```

**Response:**
```json
{
  "message": "Product created",
  "product": { ... }
}
```

---

### PUT `/api/supplier/products/:id`
Update product

**Request Body:**
```json
{
  "name": "Updated Widget",
  "price": 109.99
}
```

**Response:**
```json
{
  "message": "Product updated",
  "product": { ... }
}
```

---

### DELETE `/api/supplier/products/:id`
Delete product

**Response:**
```json
{
  "message": "Product deleted"
}
```

---

### GET `/api/supplier/inventory`
Get my inventory

**Response:**
```json
[
  {
    "id": 1,
    "productId": 1,
    "quantity": 100,
    "product": {
      "name": "Widget A",
      "category": "Electronics"
    },
    "warehouse": {
      "name": "Main Warehouse"
    }
  }
]
```

---

### POST `/api/supplier/inventory`
Add to inventory

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 50
}
```

**Response:**
```json
{
  "message": "Added to inventory",
  "inventory": { ... }
}
```

---

### PUT `/api/supplier/inventory/:id`
Update inventory quantity

**Request Body:**
```json
{
  "quantity": 150
}
```

**Response:**
```json
{
  "message": "Inventory updated",
  "inventory": { ... }
}
```

---

### DELETE `/api/supplier/inventory/:id`
Remove from inventory

**Response:**
```json
{
  "message": "Removed from inventory"
}
```

---

### GET `/api/supplier/transporters`
Get my transporters

**Response:**
```json
[
  {
    "id": 1,
    "name": "Fast Delivery Co",
    "phone": "+1234567890"
  }
]
```

---

### POST `/api/supplier/transporters`
Create transporter

**Request Body:**
```json
{
  "name": "Fast Delivery Co",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "message": "Transporter created",
  "transporter": { ... }
}
```

---

### PUT `/api/supplier/transporters/:id`
Update transporter

**Request Body:**
```json
{
  "name": "Updated Delivery",
  "phone": "+9876543210"
}
```

**Response:**
```json
{
  "message": "Transporter updated",
  "transporter": { ... }
}
```

---

### DELETE `/api/supplier/transporters/:id`
Delete transporter

**Response:**
```json
{
  "message": "Transporter deleted"
}
```

---

### GET `/api/supplier/orders`
Get orders received by supplier

**Response:**
```json
[
  {
    "id": 1,
    "orderDate": "2024-12-06T10:00:00.000Z",
    "quantity": 10,
    "totalAmount": 999.90,
    "status": "PENDING",
    "deliveryAddress": "123 Customer St",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "product": {
      "name": "Widget A"
    }
  }
]
```

---

### GET `/api/supplier/distributors`
Get all distributors (for assigning deliveries)

**Response:**
```json
[
  {
    "id": 1,
    "businessName": "Fast Logistics",
    "serviceArea": "North Region",
    "contactNumber": "+1234567890"
  }
]
```

---

### GET `/api/supplier/suppliers`
Get all suppliers

**Response:**
```json
[
  {
    "id": 1,
    "businessName": "ABC Corp",
    "contactNumber": "+1234567890"
  }
]
```

---

## 5️⃣ Distributor Routes (`/api/distributor`)

All routes require DISTRIBUTOR role.

### GET `/api/distributor/profile`
Get my distributor profile

**Response:**
```json
{
  "id": 1,
  "userId": 2,
  "businessName": "Fast Logistics",
  "businessAddress": "456 Logistics Ave",
  "contactNumber": "+1234567890",
  "serviceArea": "North Region"
}
```

---

### PUT `/api/distributor/profile`
Update distributor profile

**Request Body:**
```json
{
  "businessName": "Updated Logistics",
  "serviceArea": "Nationwide"
}
```

**Response:**
```json
{
  "message": "Profile updated",
  "profile": { ... }
}
```

---

### GET `/api/distributor/transporters`
Get my transporters

**Response:**
```json
[
  {
    "id": 2,
    "name": "Delivery Driver 1",
    "phone": "+1234567890"
  }
]
```

---

### POST `/api/distributor/transporters`
Create transporter

**Request Body:**
```json
{
  "name": "Delivery Driver 2",
  "phone": "+9876543210"
}
```

**Response:**
```json
{
  "message": "Transporter created",
  "transporter": { ... }
}
```

---

### PUT `/api/distributor/transporters/:id`
Update transporter

**Response:**
```json
{
  "message": "Transporter updated",
  "transporter": { ... }
}
```

---

### DELETE `/api/distributor/transporters/:id`
Delete transporter

**Response:**
```json
{
  "message": "Transporter deleted"
}
```

---

### GET `/api/distributor/orders/assigned`
Get orders assigned to me

**Response:**
```json
[
  {
    "id": 1,
    "order": {
      "id": 1,
      "status": "IN_PROGRESS",
      "product": {
        "name": "Widget A"
      }
    },
    "legNumber": 1,
    "status": "PENDING"
  }
]
```

---

### GET `/api/distributor/orders/held`
Get orders I'm currently holding

**Response:**
```json
[
  {
    "id": 1,
    "orderDate": "2024-12-06T10:00:00.000Z",
    "status": "IN_PROGRESS",
    "deliveryAddress": "123 Customer St",
    "legs": [...]
  }
]
```

---

### POST `/api/distributor/legs/:legId/accept`
Accept delivery assignment

**Response:**
```json
{
  "message": "Delivery accepted",
  "leg": { ... }
}
```

---

### POST `/api/distributor/legs/:legId/reject`
Reject delivery assignment

**Request Body:**
```json
{
  "reason": "Out of service area"
}
```

**Response:**
```json
{
  "message": "Delivery rejected",
  "leg": { ... }
}
```

---

### POST `/api/distributor/legs/:legId/confirm-receipt`
Confirm receipt of goods

**Response:**
```json
{
  "message": "Receipt confirmed",
  "leg": { ... }
}
```

---

### POST `/api/distributor/legs/:legId/ship`
Mark leg as in-transit

**Response:**
```json
{
  "message": "Shipped",
  "leg": { ... }
}
```

---

### POST `/api/distributor/orders/:orderId/forward`
Forward order to another distributor or customer

**Request Body:**
```json
{
  "toType": "DISTRIBUTOR",
  "toDistributorId": 2,
  "transporterId": 3
}
```

**OR**

```json
{
  "toType": "CUSTOMER",
  "transporterId": 3
}
```

**Response:**
```json
{
  "message": "Order forwarded",
  "leg": { ... }
}
```

---

### GET `/api/distributor/legs/outgoing`
Get all legs I've sent out

**Response:**
```json
[
  {
    "id": 2,
    "orderId": 1,
    "legNumber": 2,
    "status": "IN_TRANSIT",
    "toType": "CUSTOMER"
  }
]
```

---

### GET `/api/distributor/legs/:legId`
Get specific leg details

**Response:**
```json
{
  "id": 1,
  "orderId": 1,
  "legNumber": 1,
  "status": "DELIVERED",
  "fromType": "SUPPLIER",
  "toType": "DISTRIBUTOR",
  "transporter": {
    "name": "Fast Delivery Co"
  }
}
```

---

### GET `/api/distributor/distributors`
Get all other distributors

**Response:**
```json
[
  {
    "id": 2,
    "businessName": "Other Logistics",
    "serviceArea": "South Region"
  }
]
```

---

## 6️⃣ Order Routes (`/api/order`)

### GET `/api/order/products`
Get all available products (authenticated users)

**Auth Required**: Yes

**Response:**
```json
[
  {
    "id": 1,
    "name": "Widget A",
    "category": "Electronics",
    "price": 99.99,
    "supplier": {
      "businessName": "ABC Corp"
    },
    "inventories": [
      {
        "quantity": 100,
        "warehouse": {
          "name": "Main Warehouse"
        }
      }
    ]
  }
]
```

---

### POST `/api/order/`
Create order (Customer)

**Roles**: CUSTOMER

**Request Body:**
```json
{
  "productId": 1,
  "supplierId": 1,
  "quantity": 5,
  "deliveryAddress": "123 Customer Street, City, Country"
}
```

**Response:**
```json
{
  "message": "Order placed",
  "order": {
    "id": 1,
    "orderDate": "2024-12-06T10:00:00.000Z",
    "quantity": 5,
    "totalAmount": 499.95,
    "status": "PENDING",
    "deliveryAddress": "123 Customer Street"
  }
}
```

---

### GET `/api/order/my-orders`
Get my orders (as customer)

**Roles**: CUSTOMER

**Response:**
```json
[
  {
    "id": 1,
    "orderDate": "2024-12-06T10:00:00.000Z",
    "quantity": 5,
    "totalAmount": 499.95,
    "status": "PENDING",
    "product": {
      "name": "Widget A"
    },
    "supplier": {
      "businessName": "ABC Corp"
    },
    "legs": []
  }
]
```

---

### GET `/api/order/:id`
Get order by ID

**Roles**: CUSTOMER, SUPPLIER, DISTRIBUTOR, ADMIN

**Response:**
```json
{
  "id": 1,
  "orderDate": "2024-12-06T10:00:00.000Z",
  "quantity": 5,
  "totalAmount": 499.95,
  "status": "IN_PROGRESS",
  "deliveryAddress": "123 Customer Street",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "product": {
    "name": "Widget A",
    "category": "Electronics"
  },
  "supplier": {
    "businessName": "ABC Corp"
  },
  "legs": [
    {
      "legNumber": 1,
      "status": "DELIVERED",
      "fromType": "SUPPLIER",
      "toType": "DISTRIBUTOR"
    }
  ],
  "trackingEvents": [
    {
      "status": "Order placed",
      "timestamp": "2024-12-06T10:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/order/:id/cancel`
Cancel order (Customer)

**Roles**: CUSTOMER

**Response:**
```json
{
  "message": "Order cancelled",
  "order": { ... }
}
```

**Note**: Can only cancel if status is PENDING

---

### POST `/api/order/:id/confirm-delivery`
Confirm final delivery (Customer)

**Roles**: CUSTOMER

**Response:**
```json
{
  "message": "Delivery confirmed",
  "order": { ... }
}
```

---

### POST `/api/order/:id/approve`
Approve order and assign distributor (Supplier)

**Roles**: SUPPLIER

**Request Body:**
```json
{
  "distributorId": 1,
  "transporterId": 1
}
```

**Response:**
```json
{
  "message": "Order approved",
  "order": { ... },
  "leg": {
    "legNumber": 1,
    "status": "PENDING",
    "fromType": "SUPPLIER",
    "toType": "DISTRIBUTOR"
  }
}
```

**Process:**
1. Deducts inventory
2. Creates first OrderLeg
3. Generates digital signatures (orderHash, supplierSignature, serverSignature)
4. Creates QR token
5. Updates order status to APPROVED
6. Creates tracking events

---

### POST `/api/order/:id/reject`
Reject order (Supplier)

**Roles**: SUPPLIER

**Request Body:**
```json
{
  "reason": "Out of stock"
}
```

**Response:**
```json
{
  "message": "Order rejected",
  "order": { ... }
}
```

---

### POST `/api/order/:id/reassign`
Reassign order to new distributor (Supplier)

**Roles**: SUPPLIER

**Request Body:**
```json
{
  "distributorId": 2,
  "transporterId": 3
}
```

**Response:**
```json
{
  "message": "Order reassigned to new distributor",
  "order": { ... },
  "leg": { ... }
}
```

**Note**: Used when distributor rejects delivery

---

### POST `/api/order/:id/legs/:legId/ship`
Ship order (mark leg as in-transit) - Supplier

**Roles**: SUPPLIER

**Response:**
```json
{
  "message": "Order shipped",
  "leg": { ... }
}
```

---

## 7️⃣ Verification Routes (`/api/verify`)

### GET `/api/verify/?token=...`
Verify QR token (Customer scans QR on package)

**Roles**: CUSTOMER, ADMIN

**Query Params:**
- `token` - Base64 encoded QR token

**Response (Valid):**
```json
{
  "valid": true,
  "message": "Product is authentic",
  "order": {
    "id": 1,
    "orderDate": "2024-12-06T10:00:00.000Z",
    "status": "DELIVERED",
    "product": {
      "name": "Widget A",
      "category": "Electronics",
      "batchNo": "BATCH001"
    },
    "supplier": {
      "businessName": "ABC Corp"
    }
  },
  "verification": {
    "signedAt": "2024-12-06T10:30:00.000Z",
    "orderHash": "abc123...",
    "supplierSignatureValid": true,
    "serverSignatureValid": true
  }
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "message": "Invalid or tampered QR code",
  "error": "Signature verification failed"
}
```

**Verification Process:**
1. Decodes Base64 token
2. Extracts order data, signatures
3. Verifies orderHash matches order data
4. Verifies supplier signature with supplier's public key
5. Verifies server signature with server's public key

---

### GET `/api/verify/order/:id/qr`
Get QR details for an order (Supplier)

**Roles**: SUPPLIER

**Response:**
```json
{
  "orderId": 1,
  "qrToken": "eyJvcmRlcklkIjoxLCJvcmRlckhhc2giOi...",
  "orderHash": "abc123...",
  "supplierSignature": "def456...",
  "serverSignature": "ghi789...",
  "signedAt": "2024-12-06T10:30:00.000Z",
  "qrCodeData": "data:image/png;base64,..."
}
```

**Note**: Supplier can use this to generate and print QR codes for packages

---

## 🔒 Security Features

### 1. Rate Limiting
- **Auth Limiter**: 5 requests per 15 minutes (login, verify-otp)
- **OTP Limiter**: 5 requests per 15 minutes (register)

### 2. Password Security
- Bcrypt hashing with salt rounds
- Minimum requirements: 6 chars, 1 uppercase, 1 lowercase, 1 number

### 3. Digital Signatures (RSA)
- Supplier generates RSA key pair
- Server has its own RSA key pair
- Orders are signed by both supplier and server
- QR tokens contain signatures for verification
- Prevents tampering and counterfeiting

### 4. Request Validation
- Joi schemas for all inputs
- Type checking and sanitization
- SQL injection prevention via Prisma parameterized queries

### 5. CORS Configuration
- Restricted origins (configurable via .env)
- Credentials allowed for authenticated requests

### 6. Helmet.js
- Security headers
- XSS protection
- Content Security Policy

### 7. Cookie Security
- HttpOnly (prevents XSS)
- Secure (HTTPS only)
- SameSite=None (cross-origin support)

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16+)
- MySQL database
- npm or yarn

### 1. Clone & Install
```bash
cd BackEnd
npm install
```

### 2. Environment Variables
Create `.env` file:
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/supply_chain"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=3000
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"

# Email (Nodemailer)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# RSA Keys (Server)
SERVER_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
SERVER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

### 3. Generate Server Keys
```bash
node scripts/generateServerKeys.js
```

### 4. Database Setup
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed
```

### 5. Run Server
```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000`

---

## 📊 Database Migrations

All migrations are in `prisma/migrations/`:

1. **20251026153238_init** - Initial schema
2. **20251111154924_add_pending_user** - Added PendingUser table
3. **20251116102827_add_role_request_table** - Added RoleRequest
4. **20251116103703_add_multi_roles** - Multi-role support
5. **20251116140156_users_to_user** - Renamed Users to User
6. **20251130081310_add_inventory_order_flow** - Inventory & order system
7. **20251130123016_update_order_tracking** - Enhanced tracking
8. **20251206165509_final** - Digital signatures & QR verification

---

## 🧪 Testing

### API Testing Tools
- Postman
- Thunder Client
- cURL

### Test Flow
1. Register user → Verify OTP → Login
2. Create role request (Customer → Supplier)
3. Admin approves role request
4. Supplier creates products, inventory, transporters
5. Customer creates order
6. Supplier approves order (assigns distributor)
7. Distributor accepts/ships order
8. Customer confirms delivery
9. Customer verifies QR code

---

## 📝 Common Workflows

### Customer Journey
1. Register & verify email
2. Login
3. Browse available products
4. Place order
5. Track order status
6. Confirm delivery
7. Verify product authenticity via QR

### Supplier Journey
1. Register as customer
2. Request SUPPLIER role
3. Wait for admin approval
4. Setup profile & warehouse
5. Create products & inventory
6. Receive orders
7. Approve orders & assign distributors
8. Ship orders
9. Generate QR codes for packages

### Distributor Journey
1. Register as customer
2. Request DISTRIBUTOR role
3. Wait for admin approval
4. Setup profile & service area
5. Receive delivery assignments
6. Accept/reject deliveries
7. Confirm receipt from supplier
8. Forward to customer or other distributors
9. Mark deliveries as in-transit/delivered

### Admin Journey
1. Login as admin
2. View all role requests
3. Approve/reject requests
4. View all users
5. Monitor system activity

---

## 🔄 Order State Machine

```
PENDING → (Supplier Approves) → APPROVED → (Distributor Ships) → IN_PROGRESS
                                                                        ↓
PENDING → (Supplier Rejects) → CANCELLED                    (Customer Confirms) → DELIVERED

APPROVED → (Distributor Rejects) → PENDING_REASSIGN → (Supplier Reassigns) → APPROVED

PENDING → (Customer Cancels) → CANCELLED
```

---

## 🚚 Order Leg Flow

### Example: Supplier → Distributor 1 → Distributor 2 → Customer

**Leg 1**: Supplier → Distributor 1
- Status: PENDING → ACCEPTED → IN_TRANSIT → DELIVERED

**Leg 2**: Distributor 1 → Distributor 2
- Status: PENDING → ACCEPTED → IN_TRANSIT → DELIVERED

**Leg 3**: Distributor 2 → Customer
- Status: PENDING → ACCEPTED → IN_TRANSIT → DELIVERED

---

## 📞 Support

For issues or questions, contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 🎉 Version

**Version**: 1.0.0  
**Last Updated**: December 15, 2025

---

**Built with ❤️ for Supply Chain Management**
