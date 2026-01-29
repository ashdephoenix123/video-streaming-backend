const { serialize } = require("cookie");
const HTTP_ERRORS = require("../constants");
const User = require("../models/UserModel");
const Video = require("../models/VideoModel");
const HistoryModel = require("../models/HistoryModel");
const SubscriptionModel = require("../models/SubscriptionModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

const saltRounds = 10;
const jwt_secret = process.env.JWT_SECRET;

const registerNewUser = async ({ username, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(
      HTTP_ERRORS.BAD_REQUEST,
      "Email already registered! Please create with another email.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const createUser = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  return createUser;
};

const loginUser = async ({ email, password }) => {
  const findUser = await User.findOne({ email });
  if (!findUser) {
    throw new ApiError(HTTP_ERRORS.NOT_FOUND, "User not Found!");
  }

  if (!(await bcrypt.compare(password, findUser.password))) {
    throw new ApiError(HTTP_ERRORS.UNAUTHORIZED, "Invalid Credentials!");
  }

  const userDetails = {
    userId: findUser.id,
    username: findUser.username,
    email,
    createdAt: findUser.createdAt,
    avatarURL: findUser.avatarURL,
  };

  const token = jwt.sign(userDetails, jwt_secret, { expiresIn: "24h" });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "none",
    maxAge: 60 * 60 * 24,
    path: "/",
  };
  const serialized = serialize("token", token, options);

  return { serialized, userDetails };
};

const fetchUserDetails = async ({ id }) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(HTTP_ERRORS.NOT_FOUND, "User not found!");
  }

  const userDetails = {
    userId: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    avatarURL: user.avatarURL,
  };

  return userDetails;
};

const fetchUserVideos = async ({ userId, page, limit }) => {
  const videos = await Video.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  if (!videos) {
    throw new ApiError(
      HTTP_ERRORS.BAD_REQUEST,
      "Error fetching User uploaded videos!",
    );
  }

  return videos;
};

const updateUserAvatar = async ({ userId, imageUrl }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { avatarURL: imageUrl },
    { new: true },
  );

  if (!user) {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Upload failed!");
  }

  return user;
};

const ALLOWED_ACTIVITY_KEYS = ["savedVideos", "likedVideos"];
const getUserActivityVideos = async ({ userId, key }) => {
  if (!ALLOWED_ACTIVITY_KEYS.includes(key)) {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Invalid activity type");
  }

  const user = await User.findById(userId).populate(key);

  if (!user) {
    throw new ApiError(HTTP_ERRORS.NOT_FOUND, "User not found!");
  }

  let response = {
    userName: user.username,
    userAvatar: user.avatarURL,
    [key]: user[key],
  };

  return response;
};

const addToUserHistory = async ({ userId, videoId }) => {
  const userHistory = await HistoryModel.findOne({ userId });

  if (userHistory) {
    userHistory.history = userHistory.history.filter(
      (item) => item.videoId.toString() !== videoId,
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
};

const removeFromUserHistory = async ({ userId, videoId }) => {
  const userHistory = await HistoryModel.findOne({ userId });

  if (userHistory) {
    userHistory.history = userHistory.history.filter(
      (item) => item.videoId.toString() !== videoId,
    );

    await userHistory.save();
  } else {
    throw new ApiError(HTTP_ERRORS.NOT_FOUND, "User History not found!");
  }
};

const fetchUserHistory = async ({ userId }) => {
  const history = await HistoryModel.findOne({
    userId,
  })
    .populate("history.videoId")
    .populate("userId", "username avatarURL")
    .lean();

  if (!history) return [];
  return {
    userName: history.userId.username,
    userAvatar: history.userId.avatarURL,
    historyVideos: history.history.map((content) => content.videoId),
  };
};

const toggleSubscription = async ({ userId, subscriberId }) => {
  const isSubscribed = await SubscriptionModel.findOne({
    userId,
    subscriberId,
  });
  if (!isSubscribed) {
    await SubscriptionModel.create({
      userId,
      subscriberId,
    });

    return {
      action: "subscribed",
      message: "Subscribed successfully",
    };
  } else {
    await SubscriptionModel.deleteOne({ userId, subscriberId });
    return { action: "unsubscribed", message: "Unsubscribed successfully" };
  }
};

const checkSubscription = async ({ userId, subscriberId }) => {
  const isSubscribed = await SubscriptionModel.findOne({
    userId,
    subscriberId,
  });

  if (isSubscribed) {
    return { subscribed: true };
  } else {
    return { subscribed: false };
  }
};

const fetchUserSubscription = async ({ subscriberId }) => {
  const result = await SubscriptionModel.find({
    subscriberId,
  }).populate({ path: "userId", select: "username avatarURL _id" });
  return result;
};

const fetchSubscriptionDetails = async ({ userId }) => {
  const [user, videos] = await Promise.all([
    User.findById(userId),
    Video.find({ userId }),
  ]);

  if (user && videos) {
    return { user, videos };
  } else {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Not available!");
  }
};

const toggleLikeAndSave = async ({ userId, action }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(HTTP_ERRORS.NOT_FOUND, "user not found!");
  }

  if (action === "like") {
    const alreadyLiked = user.likedVideos.includes(mediaId);
    if (!alreadyLiked) {
      user.likedVideos.push(mediaId);
      await user.save();
      return {
        action: "liked",
        message: "Video saved to Liked videos!",
        status: true,
      };
    } else {
      user.likedVideos = user.likedVideos.filter(
        (vidId) => vidId.toString() != mediaId.toString(),
      );
      await user.save();
      return {
        action: "unliked",
        message: "Video removed from Liked videos!",
        status: false,
      };
    }
  } else if (action === "save") {
    const alreadySaved = user.savedVideos.includes(mediaId);
    if (!alreadySaved) {
      user.savedVideos.push(mediaId);
      await user.save();
      return { action: "saved", message: "Video saved!", status: true };
    } else {
      user.savedVideos = user.savedVideos.filter(
        (vidId) => vidId.toString() != mediaId.toString(),
      );
      await user.save();
      return {
        action: "unsaved",
        message: "Video removed from Saved!",
        status: false,
      };
    }
  } else {
    throw new ApiError(HTTP_ERRORS.BAD_REQUEST, "Invalid action");
  }
};

module.exports = {
  registerNewUser,
  loginUser,
  fetchUserDetails,
  fetchUserVideos,
  updateUserAvatar,
  getUserActivityVideos,
  addToUserHistory,
  removeFromUserHistory,
  fetchUserHistory,
  toggleSubscription,
  checkSubscription,
  fetchUserSubscription,
  fetchSubscriptionDetails,
  toggleLikeAndSave,
};
