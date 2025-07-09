const asyncHandler = require("express-async-handler");

// @desc Verify auth token
// @route /api/auth/verify
// @access private

const verifyAuthToken = asyncHandler((req, res) => {
  res.status(200).json({ message: "Token is valid", user: req.user });
});

module.exports = { verifyAuthToken };
