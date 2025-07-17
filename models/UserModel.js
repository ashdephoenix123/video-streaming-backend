const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "username is required"],
      min: [5, "should be atleast 5 characters long."],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    avatarURL: {
      type: String,
      default: null,
    },
    likedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    savedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
