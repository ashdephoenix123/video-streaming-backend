const asyncHandler = require("express-async-handler");
const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { cloudinary } = require("../config/cloudinary");
const Video = require("../models/VideoModel");
const { serialize } = require("cookie");

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
  };

  const token = jwt.sign(userDetails, jwt_secret, { expiresIn: "24h" });

  const serialized = serialize("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  res.setHeader("Set-Cookie", serialized);
  res.status(200).json({ ...userDetails, token });
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
  res.status(200).json(user);
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

module.exports = { registerUser, loginUser, getUser, getUserVideos };
