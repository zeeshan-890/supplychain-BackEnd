import * as userService from "../services/user.service.js";
import { userSchema, userUpdateSchema } from "../utils/validation.js";
import ResponseError from "../utils/customError.js";

// 🟩 Create new user
export async function createUser(req, res, next) {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const user = await userService.createUser(req.body);
    res.status(201).json({ message: "User created successfully", user });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get all users (admin-only)
export async function getAllUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// 🟨 Get user by ID
export async function getUserById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const user = await userService.getUserById(id);
    if (!user) throw new ResponseError("User doesn't exist", 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// 🟧 Get user by email (for login or lookup)
export async function getUserByEmail(req, res, next) {
  try {
    const data = req.user;

    const user = await userService.getUserByEmail(data.email);
    if (!user) throw new ResponseError("User doesn't exist", 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// 🟥 Update user
export async function updateUser(req, res, next) {
  try {
    const { error } = userUpdateSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const data = req.user;
    const user = await userService.updateUser(data.email, req.body);
    if (!user) throw new ResponseError("User doesn't exist", 404);
    res.json({ message: "User updated successfully", user });
  } catch (err) {
    next(err);
  }
}

// ⬛ Delete user
export async function deleteUser(req, res, next) {
  try {
    const data = req.user;
    const user = await userService.deleteUser(data.email);
    if (!user) throw new ResponseError("User doesn't exist", 404);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
}
