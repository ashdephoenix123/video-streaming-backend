const mongoose = require("mongoose");

const WatchedVideoSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
    required: true,
  },
  watchedAt: {
    type: Date,
    default: Date.now,
  },
});

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true,
  },
  history: [WatchedVideoSchema],
});

HistorySchema.index({ userId: 1 }, { unique: true });
module.exports = mongoose.model("HistoryModel", HistorySchema);
