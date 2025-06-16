const mongoose = require("mongoose")

const profileSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private", "team"],
      default: "public",
    },
    language: {
      type: String,
      default: "en",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    theme: {
      type: String,
      enum: ["light", "dark", "auto"],
      default: "light",
    },
    dateFormat: {
      type: String,
      default: "YYYY-MM-DD",
    },
    timeFormat: {
      type: String,
      enum: ["12", "24"],
      default: "24",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("ProfileSettings", profileSettingsSchema)
