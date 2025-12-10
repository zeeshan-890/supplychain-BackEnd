import prisma from "../config/database.js";
import ResponseError from "../utils/customError.js";
import { generateKeyPair, sha256Hash } from "../utils/crypto.js";
import { transporter, mailOptions } from "../config/nodemailer.js";

// =====================================================
// EMAIL HELPER - Send private key to supplier
// =====================================================
async function sendPrivateKeyEmail(email, name, privateKey) {
  const subject = "Your Supplier Private Key - IMPORTANT: Save Securely";

  const text = `
Dear ${name},

Congratulations! Your supplier account has been approved.

Below is your PRIVATE KEY for signing orders. This key is required when you approve orders.

IMPORTANT SECURITY NOTES:
1. Save this key securely - we will NOT send it again
2. Never share this key with anyone
3. If compromised, contact admin immediately

Your Private Key:
${privateKey}

How to use:
When approving customer orders, you will need to paste this private key to digitally sign the order. This signature proves the order is authentic and from your business.

Best regards,
Supply Chain Manager
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your Supplier Account is Approved!</h2>
      <p>Dear ${name},</p>
      <p>Congratulations! Your supplier account has been approved.</p>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #d97706; margin-top: 0;">⚠️ IMPORTANT SECURITY NOTES</h3>
        <ul style="margin: 0;">
          <li>Save this key securely - we will <strong>NOT</strong> send it again</li>
          <li>Never share this key with anyone</li>
          <li>If compromised, contact admin immediately</li>
        </ul>
      </div>

      <h3>Your Private Key:</h3>
      <pre style="background-color: #1f2937; color: #10b981; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 11px;">${privateKey}</pre>

      <h3>How to use:</h3>
      <p>When approving customer orders, you will need to paste this private key to digitally sign the order. This signature proves the order is authentic and from your business.</p>

      <p style="color: #6b7280; margin-top: 30px;">Best regards,<br>Supply Chain Manager</p>
    </div>
  `;

  await transporter.sendMail(mailOptions(email, subject, text, html));
}

// 🟩 Create a new role request (SUPPLIER or DISTRIBUTOR only)
export async function createRoleRequest(userId, data) {
  // Check if user already has a non-CUSTOMER role
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ResponseError("User not found", 404);

  if (user.role !== "CUSTOMER") {
    throw new ResponseError(
      `You already have the ${user.role} role. One role per account.`,
      400
    );
  }

  // Check if there's already a pending request
  const existingRequest = await prisma.roleRequest.findFirst({
    where: {
      userId,
      status: "PENDING",
    },
  });

  if (existingRequest) {
    throw new ResponseError(
      "You already have a pending role request. Please wait for admin approval.",
      400
    );
  }

  // Validate requested role
  if (!["SUPPLIER", "DISTRIBUTOR"].includes(data.requestedRole)) {
    throw new ResponseError(
      "Invalid role. Only SUPPLIER or DISTRIBUTOR can be requested.",
      400
    );
  }

  return prisma.roleRequest.create({
    data: {
      userId,
      requestedRole: data.requestedRole,
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      contactNumber: data.contactNumber,
      NTN: data.NTN || null,
      // Role-specific fields
      licenseNumber:
        data.requestedRole === "SUPPLIER" ? data.licenseNumber : null,
      serviceArea:
        data.requestedRole === "DISTRIBUTOR" ? data.serviceArea : null,
    },
  });
}

// 🟦 Get all requests (admin-only)
export async function getAllRoleRequests() {
  return prisma.roleRequest.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// 🟦 Get pending requests (admin-only)
export async function getPendingRoleRequests() {
  return prisma.roleRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// 🟨 Get my requests by user ID
export async function getMyRoleRequestsByUserId(userId) {
  return prisma.roleRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// 🟥 Approve or Reject a request (FULL TRANSACTION)
export async function updateRequestStatus(id, status) {
  return await prisma.$transaction(async (tx) => {
    // 1. Get the request
    const request = await tx.roleRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) throw new ResponseError("Role request not found", 404);

    if (request.status !== "PENDING") {
      throw new ResponseError(
        `Request has already been ${request.status.toLowerCase()}`,
        400
      );
    }

    // Check if user still has CUSTOMER role
    if (request.user.role !== "CUSTOMER") {
      throw new ResponseError(
        `User already has ${request.user.role} role. Cannot approve.`,
        400
      );
    }

    // 2. Update the request status
    const updatedRequest = await tx.roleRequest.update({
      where: { id },
      data: { status },
    });

    // -----------------------------------
    // CASE: APPROVE REQUEST
    // -----------------------------------
    if (status === "APPROVED") {
      const { userId, requestedRole } = request;

      // Update user role
      await tx.user.update({
        where: { id: userId },
        data: { role: requestedRole },
      });

      // Create profile based on role
      if (requestedRole === "SUPPLIER") {
        // Generate RSA key pair for supplier
        const { publicKey, privateKey } = generateKeyPair();
        const privateKeyHash = sha256Hash(privateKey.trim());

        console.log("=== NEW SUPPLIER KEY GENERATION ===");
        console.log("Private key length:", privateKey.length);
        console.log("Private key first 50 chars:", privateKey.substring(0, 50));
        console.log("Private key hash:", privateKeyHash);
        console.log("====================================");

        // Create SupplierProfile with keys
        const supplierProfile = await tx.supplierProfile.create({
          data: {
            userId,
            businessName: request.businessName,
            businessAddress: request.businessAddress,
            contactNumber: request.contactNumber,
            NTN: request.NTN,
            licenseNumber: request.licenseNumber,
            publicKey,
            privateKeyHash,
          },
        });

        // Auto-create warehouse for supplier
        await tx.warehouse.create({
          data: {
            supplierId: supplierProfile.id,
            name: "Main Warehouse",
            address: request.businessAddress,
          },
        });

        // Email private key to supplier (outside transaction to avoid blocking)
        // We use setImmediate to send email after transaction commits
        setImmediate(async () => {
          try {
            await sendPrivateKeyEmail(
              request.user.email,
              request.user.name,
              privateKey
            );
            console.log(
              `Private key emailed to supplier: ${request.user.email}`
            );
          } catch (emailError) {
            console.error(
              `Failed to email private key to ${request.user.email}:`,
              emailError
            );
          }
        });
      } else if (requestedRole === "DISTRIBUTOR") {
        // Create DistributorProfile
        await tx.distributorProfile.create({
          data: {
            userId,
            businessName: request.businessName,
            businessAddress: request.businessAddress,
            contactNumber: request.contactNumber,
            NTN: request.NTN,
            serviceArea: request.serviceArea,
          },
        });
      }

      return {
        ...updatedRequest,
        message: `User promoted to ${requestedRole}. Profile created.`,
      };
    }

    // -----------------------------------
    // CASE: REJECT REQUEST
    // -----------------------------------
    return {
      ...updatedRequest,
      message: "Role request rejected.",
    };
  });
}

// 🟨 Get request by ID
export async function getRequestById(id) {
  return prisma.roleRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}

// ⬛ Delete role request (admin can delete rejected/old requests)
export async function deleteRoleRequest(id) {
  const request = await prisma.roleRequest.findUnique({
    where: { id },
  });

  if (!request) throw new ResponseError("Role request not found", 404);

  return prisma.roleRequest.delete({
    where: { id },
  });
}
