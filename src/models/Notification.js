const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      unique: true,
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    type: {
      type: String,
      enum: [
        "policy_update",
        "shift_schedule",
        "performance_review",
        "holiday_announcement",
        "leave_approval",
        "leave_rejection",
        "payroll_processed",
        "attendance_reminder",
        "complaint_update",
        "support_response",
        "chat_message",
        "call_missed",
        "system_update",
        "birthday_reminder",
        "work_anniversary",
        "meeting_reminder",
        "document_shared",
        "task_assigned",
        "deadline_reminder",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    actionText: {
      type: String,
      trim: true,
    },
    metadata: {
      entityType: String, // 'leave', 'payroll', 'policy', etc.
      entityId: mongoose.Schema.Types.ObjectId,
      additionalData: mongoose.Schema.Types.Mixed,
    },
    expiresAt: {
      type: Date,
    },
    category: {
      type: String,
      enum: ["recent", "earlier", "archived"],
      default: "recent",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for recipient details
notificationSchema.virtual("recipient", {
  ref: "Employee",
  localField: "recipientId",
  foreignField: "_id",
  justOne: true,
})

// Virtual for sender details
notificationSchema.virtual("sender", {
  ref: "Employee",
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
})

// Auto-generate notification ID
notificationSchema.pre("save", async function (next) {
  if (!this.notificationId) {
    const timestamp = Date.now()
    this.notificationId = `NOTIF${timestamp}`
  }
  next()
})

// Auto-categorize notifications based on age
notificationSchema.pre("save", function (next) {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  if (this.createdAt > dayAgo) {
    this.category = "recent"
  } else {
    this.category = "earlier"
  }
  next()
})

// Index for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1 })
notificationSchema.index({ type: 1 })
notificationSchema.index({ priority: 1 })
notificationSchema.index({ createdAt: -1 })
notificationSchema.index({ category: 1 })

module.exports = mongoose.model("Notification", notificationSchema)
