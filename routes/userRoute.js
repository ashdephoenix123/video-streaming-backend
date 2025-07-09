const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
  getUserVideos,
  logOut,
} = require("../controller/userController");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logOut);
router.get("/:id", verifyToken, getUser);
router.get("/videos/:userId", verifyToken, getUserVideos);

module.exports = router;
