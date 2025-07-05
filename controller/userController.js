const asyncHandler = require("express-async-handler");
const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
    username: findUser.username,
    email,
    createdAt: findUser.createdAt,
  };

  const token = jwt.sign(userDetails, jwt_secret, { expiresIn: "24h" });

  res.status(200).json({ ...userDetails, token });
});

module.exports = { registerUser, loginUser };
