const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "emoji"],
      default: "text",
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },
    ],
    chatType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },
    chatName: {
      type: String,
      trim: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for participant details
chatSchema.virtual("participantDetails", {
  ref: "Employee",
  localField: "participants",
  foreignField: "_id",
})

// Index for efficient queries
chatSchema.index({ participants: 1 })
chatSchema.index({ lastActivity: -1 })
chatSchema.index({ "messages.senderId": 1 })

module.exports = mongoose.model("Chat", chatSchema)
