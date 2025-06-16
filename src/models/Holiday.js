const mongoose = require("mongoose")

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["national", "festival", "company", "optional"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    applicableLocations: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
holidaySchema.index({ date: 1 })
holidaySchema.index({ type: 1 })
holidaySchema.index({ isActive: 1 })

module.exports = mongoose.model("Holiday", holidaySchema)
