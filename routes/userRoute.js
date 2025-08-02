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
  getSavedVideos,
  addVideoToHistory,
  getUserHistory,
  removeVideoFromHistory,
  subscribeToUser,
  checkSubscription,
  getUserSubscription,
  getSubDetails,
} = require("../controller/userController");
const verifyToken = require("../middleware/verifyToken");
const { uploadImage } = require("../config/cloudinary");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logOut);
router.post("/subscribe", subscribeToUser);
router.post("/subscribe/getSubscriptionDetail", getSubDetails);

router.get("/:id", verifyToken, getUser);
router.get("/videos/:userId", verifyToken, getUserVideos);
router.post(
  "/upload-avatar",
  verifyToken,
  uploadImage.single("avatar"),
  uploadAvatar
);
router.post("/likeOrSave", verifyToken, likeOrSaveVideo);
router.get("/likedVideos/user", verifyToken, getLikedVideos);
router.get("/savedVideos/user", verifyToken, getSavedVideos);
router.post("/history", verifyToken, addVideoToHistory);
router.get("/history/user", verifyToken, getUserHistory);
router.post("/history/remove", verifyToken, removeVideoFromHistory);
router.post("/subscribe/getStatus", verifyToken, checkSubscription);
router.get("/subscribe/mySubscriptions", verifyToken, getUserSubscription);

module.exports = router;
