const express = require("express");
const { verifyAuthToken } = require("../controller/authController");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.get("/verify", verifyToken, verifyAuthToken);

module.exports = router;
