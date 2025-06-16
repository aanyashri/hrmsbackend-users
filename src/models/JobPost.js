const mongoose = require("mongoose")

const jobPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Full Time", "Part Time", "Contract", "Internship", "Remote"],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    aboutCompany: {
      type: String,
      trim: true,
    },
    responsibilities: [
      {
        type: String,
        trim: true,
      },
    ],
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    department: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    experience: {
      min: {
        type: Number,
        min: 0,
        default: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    activeUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    urgent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for posted by user
jobPostSchema.virtual("poster", {
  ref: "User",
  localField: "postedBy",
  foreignField: "_id",
  justOne: true,
})

// Index for efficient queries
jobPostSchema.index({ title: "text", description: "text" })
jobPostSchema.index({ type: 1 })
jobPostSchema.index({ location: 1 })
jobPostSchema.index({ department: 1 })
jobPostSchema.index({ isActive: 1 })
jobPostSchema.index({ activeUntil: 1 })
jobPostSchema.index({ createdAt: -1 })

module.exports = mongoose.model("JobPost", jobPostSchema)
