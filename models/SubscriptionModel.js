const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subscriberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subscribedAt: { type: Date, default: Date.now },
});

SubscriptionSchema.index({ userId: 1, subscriberId: 1 }, { unique: true });
module.exports = mongoose.model("SubscriptionModel", SubscriptionSchema);
