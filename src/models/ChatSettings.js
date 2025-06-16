const mongoose = require("mongoose")

const chatSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: {
      type: Date,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
    },
    notificationSettings: {
      showPreviews: {
        type: Boolean,
        default: true,
      },
      soundEnabled: {
        type: Boolean,
        default: true,
      },
      vibrationEnabled: {
        type: Boolean,
        default: true,
      },
    },
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    pinnedMessages: [
      {
        messageId: mongoose.Schema.Types.ObjectId,
        pinnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Compound index for unique user-chat combination
chatSettingsSchema.index({ userId: 1, chatId: 1 }, { unique: true })

module.exports = mongoose.model("ChatSettings", chatSettingsSchema)
