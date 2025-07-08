const { kebabCase } = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const VideoSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  slug: { type: String, unique: true },
  title: String,
  description: String,
  hlsUrl: String,
  publicId: String, // optional but helpful for future delete operations
  thumbnailUrl: String, // optional
  createdAt: { type: Date, default: Date.now },
});

VideoSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    const baseSlug = kebabCase(this.title);
    const timestamp = Date.now().toString(36).slice(-4); // short unique part
    this.slug = `${baseSlug}-${timestamp}`;
  }
  next();
});

module.exports = mongoose.model("Video", VideoSchema);
