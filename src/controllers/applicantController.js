const { generateResponse } = require("../utils/responseHelper")
const { Applicant, JobPost } = require("../models")
const mongoose = require("mongoose")

/**
 * Get all applicants with filtering options
 */
const getAllApplicants = async (req, res) => {
  try {
    const { status, jobId, search, page = 1, limit = 20, sortBy = "appliedDate", sortOrder = "desc" } = req.query

    // Build query
    const query = {}

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Filter by job if provided
    if (jobId) {
      query.jobId = mongoose.Types.ObjectId(jobId)
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ]
    }

    // Count total applicants
    const totalApplicants = await Applicant.countDocuments(query)

    // Get paginated applicants
    const applicants = await Applicant.find(query)
      .populate("jobId", "title department location")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    // Group applicants by status
    const groupedApplicants = {
      SOURCED: [],
      IN_PROGRESS: [],
      INTERVIEW: [],
      HIRED: [],
      REJECTED: [],
    }

    applicants.forEach((applicant) => {
      if (groupedApplicants[applicant.status]) {
        groupedApplicants[applicant.status].push(applicant)
      }
    })

    // Get counts by status
    const statusCounts = {
      SOURCED: await Applicant.countDocuments({ ...query, status: "SOURCED" }),
      IN_PROGRESS: await Applicant.countDocuments({ ...query, status: "IN_PROGRESS" }),
      INTERVIEW: await Applicant.countDocuments({ ...query, status: "INTERVIEW" }),
      HIRED: await Applicant.countDocuments({ ...query, status: "HIRED" }),
      REJECTED: await Applicant.countDocuments({ ...query, status: "REJECTED" }),
    }

    const response = {
      applicants: groupedApplicants,
      statusCounts,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalApplicants / limit),
        totalApplicants,
        hasNext: page * limit < totalApplicants,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Applicants retrieved successfully", response))
  } catch (error) {
    console.error("Get applicants error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get applicant by ID
 */
const getApplicantById = async (req, res) => {
  try {
    const { id } = req.params

    const applicant = await Applicant.findById(id).populate("jobId", "title department location")

    if (!applicant) {
      return res.status(404).json(generateResponse(false, "Applicant not found"))
    }

    res.status(200).json(generateResponse(true, "Applicant retrieved successfully", applicant))
  } catch (error) {
    console.error("Get applicant error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update applicant status
 */
const updateApplicantStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    if (!["SOURCED", "IN_PROGRESS", "INTERVIEW", "HIRED", "REJECTED"].includes(status)) {
      return res.status(400).json(generateResponse(false, "Invalid status"))
    }

    const applicant = await Applicant.findById(id)

    if (!applicant) {
      return res.status(404).json(generateResponse(false, "Applicant not found"))
    }

    // Update status and add status history
    applicant.status = status
    applicant.statusHistory.push({
      status,
      date: new Date(),
      notes: notes || "",
      updatedBy: req.user.id,
    })

    await applicant.save()

    res.status(200).json(generateResponse(true, "Applicant status updated successfully", applicant))
  } catch (error) {
    console.error("Update applicant status error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Add notes to applicant
 */
const addApplicantNote = async (req, res) => {
  try {
    const { id } = req.params
    const { note } = req.body

    if (!note) {
      return res.status(400).json(generateResponse(false, "Note is required"))
    }

    const applicant = await Applicant.findById(id)

    if (!applicant) {
      return res.status(404).json(generateResponse(false, "Applicant not found"))
    }

    applicant.notes.push({
      content: note,
      createdBy: req.user.id,
      createdAt: new Date(),
    })

    await applicant.save()

    res.status(200).json(generateResponse(true, "Note added successfully", applicant))
  } catch (error) {
    console.error("Add applicant note error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Schedule interview for applicant
 */
const scheduleInterview = async (req, res) => {
  try {
    const { id } = req.params
    const { date, time, interviewers, type, location, notes } = req.body

    if (!date || !time || !type) {
      return res.status(400).json(generateResponse(false, "Date, time and type are required"))
    }

    const applicant = await Applicant.findById(id)

    if (!applicant) {
      return res.status(404).json(generateResponse(false, "Applicant not found"))
    }

    // Create interview
    applicant.interviews.push({
      date,
      time,
      interviewers: interviewers || [],
      type,
      location: location || "Online",
      notes: notes || "",
      status: "SCHEDULED",
      createdBy: req.user.id,
    })

    // Update status to INTERVIEW if not already
    if (applicant.status !== "INTERVIEW") {
      applicant.status = "INTERVIEW"
      applicant.statusHistory.push({
        status: "INTERVIEW",
        date: new Date(),
        notes: `Interview scheduled for ${date} at ${time}`,
        updatedBy: req.user.id,
      })
    }

    await applicant.save()

    res.status(200).json(generateResponse(true, "Interview scheduled successfully", applicant))
  } catch (error) {
    console.error("Schedule interview error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get applicant statistics
 */
const getApplicantStats = async (req, res) => {
  try {
    // Get counts by status
    const statusCounts = {
      SOURCED: await Applicant.countDocuments({ status: "SOURCED" }),
      IN_PROGRESS: await Applicant.countDocuments({ status: "IN_PROGRESS" }),
      INTERVIEW: await Applicant.countDocuments({ status: "INTERVIEW" }),
      HIRED: await Applicant.countDocuments({ status: "HIRED" }),
      REJECTED: await Applicant.countDocuments({ status: "REJECTED" }),
    }

    // Get total applicants
    const totalApplicants = await Applicant.countDocuments()

    // Get applicants by job
    const jobStats = await Applicant.aggregate([
      {
        $group: {
          _id: "$jobId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "jobposts",
          localField: "_id",
          foreignField: "_id",
          as: "job",
        },
      },
      {
        $unwind: "$job",
      },
      {
        $project: {
          jobTitle: "$job.title",
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ])

    // Get applicants by source
    const sourceStats = await Applicant.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    const stats = {
      totalApplicants,
      statusCounts,
      jobStats,
      sourceStats,
    }

    res.status(200).json(generateResponse(true, "Applicant statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get applicant stats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllApplicants,
  getApplicantById,
  updateApplicantStatus,
  addApplicantNote,
  scheduleInterview,
  getApplicantStats,
}
