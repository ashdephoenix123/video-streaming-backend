const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
} = require("../controller/userController");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:id", verifyToken, getUser);

module.exports = router;
