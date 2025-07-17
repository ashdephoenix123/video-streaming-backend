const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
  getUserVideos,
  logOut,
  uploadAvatar,
  likeOrSaveVideo,
  getLikedVideos,
} = require("../controller/userController");
const verifyToken = require("../middleware/verifyToken");
const { uploadImage } = require("../config/cloudinary");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logOut);
router.get("/:id", verifyToken, getUser);
router.get("/videos/:userId", verifyToken, getUserVideos);
router.post(
  "/upload-avatar",
  verifyToken,
  uploadImage.single("avatar"),
  uploadAvatar
);
router.post("/likeOrSave", verifyToken, likeOrSaveVideo);
router.get("/likedVideos/:userId", verifyToken, getLikedVideos);

module.exports = router;
