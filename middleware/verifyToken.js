const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const HTTP_ERRORS = require("../constants");
const ApiError = require("../utils/ApiError");
const jwt_secret = process.env.JWT_SECRET;

const verifyToken = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, jwt_secret);
      req.user = decoded;
      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      throw new ApiError(HTTP_ERRORS.UNAUTHORIZED, "Token invalid or expired!");
    }
  }

  if (!token) {
    throw new ApiError(HTTP_ERRORS.UNAUTHORIZED, "Auth token not provided!");
  }
});

module.exports = verifyToken;
