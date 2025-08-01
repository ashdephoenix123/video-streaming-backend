const asyncHandler = require("express-async-handler");
const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { cloudinary, uploadImage } = require("../config/cloudinary");
const Video = require("../models/VideoModel");
const { serialize } = require("cookie");
const HistoryModel = require("../models/HistoryModel");

const saltRounds = 10;
const jwt_secret = process.env.JWT_SECRET;

// @desc register user
// @route POST /api/user/register
// @access public

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const user = await User.findOne({ email });
  if (user) {
    res.status(400);
    throw new Error(
      "Email already registered! Please create with another email."
    );
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const createUser = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  res.status(201).json(createUser);
});

// @desc login user
// @route POST /api/user/login
// @access public

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required to login.");
  }

  const findUser = await User.findOne({ email });
  if (!findUser) {
    res.status(404);
    throw new Error("User not Found!");
  }

  if (!(await bcrypt.compare(password, findUser.password))) {
    res.status(400);
    throw new Error("Invalid Credentials");
  }

  const userDetails = {
    userId: findUser.id,
    username: findUser.username,
    email,
    createdAt: findUser.createdAt,
    avatarURL: findUser.avatarURL,
  };

  const token = jwt.sign(userDetails, jwt_secret, { expiresIn: "24h" });

  const serialized = serialize("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: process.env.NODE_ENV == "production" ? "none" : "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
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
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  res.setHeader("Set-Cookie", serialized);
  res.status(200).json({ message: "Logged out" });
});

// @desc get user
// @route GET /api/user/:id
// @access private

const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found!");
  }

  const userDetails = {
    userId: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    avatarURL: user.avatarURL,
  };
  res.status(200).json(userDetails);
});

// @desc get user videos
// @route GET /api/user/videos/:userId
// @access private

const getUserVideos = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const { userId } = req.params;
  const videos = await Video.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  if (!videos) {
    res.status(400);
    throw new Error("Error fetching User uploaded videos.");
  }
  res.status(200).json(videos);
});

// @desc Post user avatar
// @route GET /api/user/upload-avatar
// @access private

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file received" });
  }

  const imageUrl = req.file.path;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { avatarURL: imageUrl },
    { new: true }
  );

  if (!user) {
    res.status(400);
    throw new Error("Upload failed!");
  }

  return res.json({ imageUrl: user?.avatarURL });
});

const likeOrSaveVideo = asyncHandler(async (req, res) => {
  const { userId, mediaId } = req.body;

  const action = req.body.action?.toLowerCase();

  if (!userId || !mediaId || !action) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("user not found!");
  }

  if (action === "like") {
    const alreadyLiked = user.likedVideos.includes(mediaId);
    if (!alreadyLiked) {
      user.likedVideos.push(mediaId);
      await user.save();
      return res
        .status(200)
        .json({ message: "Video saved to Liked videos!", status: true });
    } else {
      user.likedVideos = user.likedVideos.filter(
        (vidId) => vidId.toString() != mediaId.toString()
      );
      await user.save();
      return res
        .status(200)
        .json({ message: "Video removed from Liked videos!", status: false });
    }
  } else if (action === "save") {
    const alreadySaved = user.savedVideos.includes(mediaId);
    if (!alreadySaved) {
      user.savedVideos.push(mediaId);
      await user.save();
      return res.status(200).json({ message: "Video saved!", status: true });
    } else {
      user.savedVideos = user.savedVideos.filter(
        (vidId) => vidId.toString() != mediaId.toString()
      );
      await user.save();
      return res
        .status(200)
        .json({ message: "Video removed from Saved!", status: false });
    }
  } else {
    res.status(400);
    throw new Error("Invalid action");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("likedVideos");

    if (!user) {
      res.status(404);
      throw new Error("User not found!");
    }

    return res.status(200).json({
      userName: user.username,
      userAvatar: user.avatarURL,
      likedVideos: user.likedVideos,
    });
  } catch (err) {
    console.error("Error fetching liked videos:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const getSavedVideos = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("savedVideos");

    if (!user) {
      res.status(404);
      throw new Error("User not found!");
    }

    return res.status(200).json({
      userName: user.username,
      userAvatar: user.avatarURL,
      savedVideos: user.savedVideos,
    });
  } catch (err) {
    console.error("Error fetching saved videos:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const addVideoToHistory = asyncHandler(async (req, res) => {
  const { userId, videoId } = req.body;

  if (!userId || !videoId) {
    res.status(400);
    throw new Error("UserId and VideoId are not provided!");
  }
  const userHistory = await HistoryModel.findOne({ userId });

  if (userHistory) {
    userHistory.history = userHistory.history.filter(
      (item) => item.videoId.toString() !== videoId
    );

    userHistory.history.unshift({ videoId });
    if (userHistory.history.length > 50) userHistory.history.pop();
    await userHistory.save();
  } else {
    await HistoryModel.create({
      userId,
      history: [{ videoId }],
    });
  }

  res.status(200).json({ message: "History updated" });
});

const removeVideoFromHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.body;

  if (!req.user.userId || !videoId) {
    res.status(400);
    throw new Error("UserId and VideoId are not provided!");
  }
  const userHistory = await HistoryModel.findOne({ userId: req.user.userId });

  if (userHistory) {
    userHistory.history = userHistory.history.filter(
      (item) => item.videoId.toString() !== videoId
    );

    await userHistory.save();
  } else {
    res.status(404);
    throw new Error("User History not found!");
  }

  res.status(200).json({ message: "Removed video from history!" });
});

const getUserHistory = asyncHandler(async (req, res) => {
  const history = await HistoryModel.findOne({
    userId: req.user.userId,
  })
    .populate("history.videoId")
    .populate("userId", "username avatarURL")
    .lean();

  if (!history) return res.status(200).json([]);
  res.status(200).json({
    userName: history.userId.username,
    userAvatar: history.userId.avatarURL,
    historyVideos: history.history.map((content) => content.videoId),
  });
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
};
