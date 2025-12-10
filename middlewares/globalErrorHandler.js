import { Prisma } from "@prisma/client";
import ResponseError from "../utils/customError.js";

const errorHandler = (error, req, res, next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Known error (e.g., constraint violation)
    console.error(error);
    return res.status(400).json({ message: extractSafeMessage(error.code) });
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    // Validation error (e.g., wrong input types)
    console.error(error);
    return res.status(400).json({ message: extractSafeMessage(error.code) });
  } else {
    console.error(error);

    // Other Prisma Errors
    if (error instanceof ResponseError) {
      return res
        .status(error.code || 500)
        .json({ message: error.message || "Internal Server Error" });
    }

    // Other Errors
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Helpers
const errorMap = {
  P2002: "Duplicate entry. This value must be unique.",
  P2025: "Record not found.",
  P2003: "Invalid foreign key reference.",
};

function extractSafeMessage(code) {
  return errorMap[code] || "Invalid Input";
}

export default errorHandler;
