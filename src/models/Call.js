const mongoose = require("mongoose")

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      unique: true,
      required: true,
    },
    callType: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },
    initiatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    status: {
      type: String,
      enum: ["initiated", "ringing", "answered", "ended", "missed", "declined"],
      default: "initiated",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    quality: {
      type: String,
      enum: ["excellent", "good", "fair", "poor"],
    },
    recordingUrl: {
      type: String,
    },
    isRecorded: {
      type: Boolean,
      default: false,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      deviceType: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for initiator details
callSchema.virtual("initiator", {
  ref: "Employee",
  localField: "initiatorId",
  foreignField: "_id",
  justOne: true,
})

// Virtual for participant details
callSchema.virtual("participant", {
  ref: "Employee",
  localField: "participantId",
  foreignField: "_id",
  justOne: true,
})

// Auto-generate call ID
callSchema.pre("save", async function (next) {
  if (!this.callId) {
    const timestamp = Date.now()
    this.callId = `CALL${timestamp}`
  }
  next()
})

// Calculate duration before saving
callSchema.pre("save", function (next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000)
  }
  next()
})

// Index for efficient queries
callSchema.index({ initiatorId: 1 })
callSchema.index({ participantId: 1 })
callSchema.index({ status: 1 })
callSchema.index({ startTime: -1 })

module.exports = mongoose.model("Call", callSchema)
