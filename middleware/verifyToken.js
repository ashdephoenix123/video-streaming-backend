const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const jwt_secret = process.env.JWT_SECRET;

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401);
    throw new Error("Auth token not provided!");
  }
  try {
    const decoded = jwt.verify(token, jwt_secret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Token invalid or expired!");
  }
});

module.exports = verifyToken;
