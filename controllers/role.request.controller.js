import * as roleRequestService from "../services/role.request.service.js";
import ResponseError from "../utils/customError.js";

// 🟩 Create new role request
export async function createRoleRequest(req, res, next) {
  try {
    const { requestedRole, businessName, businessAddress, phone } = req.body;

    if (
      !requestedRole ||
      !["SUPPLIER", "DISTRIBUTOR"].includes(requestedRole)
    ) {
      throw new ResponseError(
        "Invalid role requested. Must be SUPPLIER or DISTRIBUTOR",
        400
      );
    }
    if (!businessName || !businessAddress) {
      throw new ResponseError(
        "businessName and businessAddress are required",
        400
      );
    }

    const request = await roleRequestService.createRoleRequest(
      req.user.id,
      req.body
    );

    res.status(201).json({
      message: "Role request created successfully",
      request,
    });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get all role requests (ADMIN ONLY)
export async function getAllRoleRequests(req, res, next) {
  try {
    const requests = await roleRequestService.getAllRoleRequests();
    res.json(requests);
  } catch (err) {
    next(err);
  }
}

// 🟦 Get all role requests (ADMIN ONLY)
export async function getPendingRoleRequests(req, res, next) {
  try {
    const requests = await roleRequestService.getPendingRoleRequests();
    res.json(requests);
  } catch (err) {
    next(err);
  }
}

// 🟨 Get my role requests (by authenticated user)
export async function getMyRoleRequests(req, res, next) {
  try {
    const user = req.user;

    const requests = await roleRequestService.getMyRoleRequestsByUserId(
      user.id
    );
    res.json(requests);
  } catch (err) {
    next(err);
  }
}

// 🟧 Get role request by ID (admin or owner)
export async function getRoleRequestById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const request = await roleRequestService.getRequestById(id);

    if (!request) throw new ResponseError("Request not found", 404);

    res.json(request);
  } catch (err) {
    next(err);
  }
}

// 🟥 Approve or Reject request (admin-only)
export async function updateRoleRequestStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new ResponseError("Invalid request ID", 400);

    const { status } = req.body;
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      throw new ResponseError("Status must be APPROVED or REJECTED", 400);
    }

    const updatedRequest = await roleRequestService.updateRequestStatus(
      id,
      status
    );

    res.json({
      message: `Request ${status.toLowerCase()} successfully`,
      updatedRequest,
    });
  } catch (err) {
    next(err);
  }
}

// ⬛ Delete a role request (admin-only)
export async function deleteRoleRequest(req, res, next) {
  try {
    const id = parseInt(req.params.id);

    const request = await roleRequestService.getRequestById(id);
    if (!request) throw new ResponseError("Role request not found", 404);

    await roleRequestService.deleteRoleRequest(id);

    res.json({
      message: "Role request deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
