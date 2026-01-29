const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const HTTP_ERRORS = require("../constants");
const ApiError = require("../utils/ApiError");
const jwt_secret = process.env.JWT_SECRET;

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(HTTP_ERRORS.UNAUTHORIZED, "Auth token not provided!");
  }

  try {
    const decoded = jwt.verify(token, jwt_secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    throw new ApiError(HTTP_ERRORS.UNAUTHORIZED, "Token invalid or expired!");
  }
});

module.exports = verifyToken;
