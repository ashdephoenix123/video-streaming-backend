const asyncHandler = require("express-async-handler");
const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Video = require("../models/VideoModel");
const { serialize } = require("cookie");
const HistoryModel = require("../models/HistoryModel");
const SubscriptionModel = require("../models/SubscriptionModel");
const userServices = require("../services/user.services");
const HTTP_ERRORS = require("../constants");
const ApiError = require("../utils/ApiError");
const client = require("../config/redis");
const { cachedUserVideoKey } = require("../utils/helperFunctions");

// @desc register user
// @route POST /api/user/register
// @access public

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "All fields are required");
  }

  const newUser = await userServices.registerNewUser({
    username,
    email,
    password,
  });

  res.status(201).json(newUser);
});

// @desc login user
// @route POST /api/user/login
// @access public

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(
      HTTP_ERRORS.BAD_REQUEST,
      "Email and password are required to login.",
    );
  }

  const { serialized, userDetails } = await userServices.loginUser({
    email,
    password,
  });

  res.setHeader("Set-Cookie", serialized);
  res.status(200).json({ ...userDetails });
});

// @desc logout user
// @route POST /api/user/logout
// @access public

const logOut = asyncHandler(async (req, res) => {
  const serialized = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV == "production" ? "none" : "lax",
    expires: new Date(0),
    path: "/",
    domain: ".flixstream.online",
  });

  res.setHeader("Set-Cookie", serialized);
  res.status(200).json({ message: "Logged out" });
});

// @desc get user
// @route GET /api/user/:id
// @access private

const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userDetails = await userServices.fetchUserDetails({ id });
  res.status(200).json(userDetails);
});

// @desc get user videos
// @route GET /api/user/videos/:userId
// @access private

const getUserVideos = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { userId } = req.params;

  const cachedKey = cachedUserVideoKey(userId);

  // try to fetch user videos from redis cache
  const cachedVideos = await client.get(cachedKey);
  if (cachedVideos) {
    res.status(200).json(JSON.parse(cachedVideos));
  } else {
    const videos = await userServices.fetchUserVideos({ userId, page, limit });

    // Save to redis with expiration time
    await client.set(cachedKey, JSON.stringify(videos), { EX: 86400 }); // 1 day expiration time
    res.status(200).json(videos);
  }
});

// @desc Post user avatar
// @route GET /api/user/upload-avatar
// @access private

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file received" });
  }

  const imageUrl = req.file.path;
  const user = await userServices.updateUserAvatar({
    userId: req.user.userId,
    imageUrl,
  });

  return res.json({ imageUrl: user?.avatarURL });
});

const likeOrSaveVideo = asyncHandler(async (req, res) => {
  const { userId, mediaId } = req.body;

  const action = req.body.action?.toLowerCase();

  if (!userId || !mediaId || !action) {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Missing required fields");
  }

  const result = await userServices.toggleLikeAndSave({
    userId,
    action,
    mediaId,
  });
  res.status(200).json(result);
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const result = await userServices.getUserActivityVideos({
    userId: req.user.userId,
    key: "likedVideos",
  });

  return res.status(200).json(result);
});

const getSavedVideos = asyncHandler(async (req, res) => {
  const result = await userServices.getUserActivityVideos({
    userId: req.user.userId,
    key: "savedVideos",
  });

  return res.status(200).json(result);
});

const addVideoToHistory = asyncHandler(async (req, res) => {
  const { userId, videoId } = req.body;

  if (!userId || !videoId) {
    throw new ApiError(
      HTTP_ERRORS.BAD_REQUEST,
      "UserId and VideoId are not provided!",
    );
  }

  await userServices.addToUserHistory({ userId, videoId });
  res.status(200).json({ message: "History updated" });
});

const removeVideoFromHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.body;

  if (!req.user.userId || !videoId) {
    throw new ApiError(
      HTTP_ERRORS.BAD_REQUEST,
      "UserId and VideoId are not provided!",
    );
  }
  await userServices.removeFromUserHistory({
    userId: req.user.userId,
    videoId,
  });

  res.status(200).json({ message: "Removed video from history!" });
});

const getUserHistory = asyncHandler(async (req, res) => {
  const history = await userServices.fetchUserHistory({
    userId: req.user.userId,
  });
  res.status(200).json(history);
});

const subscribeToUser = asyncHandler(async (req, res) => {
  const { userId, subscriberId } = req.body;
  if (!userId || !subscriberId) {
    throw new ApiError(
      HTTP_ERRORS.BAD_REQUEST,
      "Subscriber ID and the ID of the user to whom subscribing are required",
    );
  }

  const result = userServices.toggleSubscription({ userId, subscriberId });
  let statusCode = result.action === "subscribed" ? 201 : 200;
  res.status(statusCode).json({ message: result.message });
});

const checkSubscription = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const result = await userServices.checkSubscription({
    userId,
    subscriberId: req.user.userId,
  });
  res.status(200).json(result);
});

const getUserSubscription = asyncHandler(async (req, res) => {
  const result = await userServices.fetchUserSubscription({
    subscriberId: req.user.userId,
  });
  return res.status(200).json(result);
});

const getSubDetails = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const result = await userServices.fetchSubscriptionDetails({ userId });
  return res.status(200).json(result);
});

module.exports = {
  registerUser,
  loginUser,
  logOut,
  getUser,
  getUserVideos,
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
};
