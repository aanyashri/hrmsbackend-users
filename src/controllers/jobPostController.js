const { generateResponse } = require("../utils/responseHelper")
const { JobPost } = require("../models")
const moment = require("moment")

const createJobPost = async (req, res) => {
  try {
    const { jobTitle, jobType, location, description, aboutCompany, whatYoullDo, requirements } = req.body

    if (!jobTitle || !jobType || !location || !description) {
      return res.status(400).json(generateResponse(false, "Required fields are missing"))
    }

    const newJobPost = new JobPost({
      title: jobTitle,
      type: jobType,
      location,
      description,
      aboutCompany,
      responsibilities: whatYoullDo ? whatYoullDo.split("\n").filter((item) => item.trim()) : [],
      requirements: requirements ? requirements.split("\n").filter((item) => item.trim()) : [],
      department: "General", // Can be derived from jobType or added as field
      postedBy: req.user.userId,
      activeUntil: moment().add(30, "days").toDate(), // Active for 30 days by default
    })

    await newJobPost.save()

    res.status(201).json(generateResponse(true, "Job post created successfully", newJobPost))
  } catch (error) {
    console.error("Create job post error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getJobPosts = async (req, res) => {
  try {
    const { page = 1, limit = 9, search = "", type = "", location = "" } = req.query

    const query = { isActive: true }

    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { department: new RegExp(search, "i") },
      ]
    }

    if (type) {
      query.type = new RegExp(type, "i")
    }

    if (location) {
      query.location = new RegExp(location, "i")
    }

    const jobPosts = await JobPost.find(query)
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    const totalJobPosts = await JobPost.countDocuments(query)

    const formattedJobPosts = jobPosts.map((job) => ({
      id: job._id,
      title: job.title,
      type: job.type,
      location: job.location,
      description: job.description,
      department: job.department,
      postedDate: moment(job.createdAt).format("MMM DD, YYYY"),
      activeUntil: moment(job.activeUntil).format("MMM DD, YYYY"),
      status: job.isActive ? "Active" : "Inactive",
      applicationsCount: job.applicationsCount || 0,
      image: "/placeholder.svg?height=200&width=300", // Placeholder image
    }))

    const response = {
      jobPosts: formattedJobPosts,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalJobPosts / limit),
        totalJobPosts,
      },
    }

    res.status(200).json(generateResponse(true, "Job posts retrieved successfully", response))
  } catch (error) {
    console.error("Get job posts error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getJobPostById = async (req, res) => {
  try {
    const { id } = req.params

    const jobPost = await JobPost.findById(id).populate("postedBy", "name email")

    if (!jobPost) {
      return res.status(404).json(generateResponse(false, "Job post not found"))
    }

    const formattedJobPost = {
      id: jobPost._id,
      title: jobPost.title,
      type: jobPost.type,
      location: jobPost.location,
      description: jobPost.description,
      aboutCompany: jobPost.aboutCompany,
      responsibilities: jobPost.responsibilities,
      requirements: jobPost.requirements,
      department: jobPost.department,
      postedDate: moment(jobPost.createdAt).format("MMM DD, YYYY"),
      activeUntil: moment(jobPost.activeUntil).format("MMM DD, YYYY"),
      postedBy: jobPost.postedBy,
      applicationsCount: jobPost.applicationsCount || 0,
    }

    res.status(200).json(generateResponse(true, "Job post retrieved successfully", formattedJobPost))
  } catch (error) {
    console.error("Get job post error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateJobPost = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const jobPost = await JobPost.findById(id)
    if (!jobPost) {
      return res.status(404).json(generateResponse(false, "Job post not found"))
    }

    // Process responsibilities and requirements if they're strings
    if (updates.responsibilities && typeof updates.responsibilities === "string") {
      updates.responsibilities = updates.responsibilities.split("\n").filter((item) => item.trim())
    }

    if (updates.requirements && typeof updates.requirements === "string") {
      updates.requirements = updates.requirements.split("\n").filter((item) => item.trim())
    }

    Object.assign(jobPost, updates)
    await jobPost.save()

    res.status(200).json(generateResponse(true, "Job post updated successfully", jobPost))
  } catch (error) {
    console.error("Update job post error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const deleteJobPost = async (req, res) => {
  try {
    const { id } = req.params

    const jobPost = await JobPost.findById(id)
    if (!jobPost) {
      return res.status(404).json(generateResponse(false, "Job post not found"))
    }

    jobPost.isActive = false
    await jobPost.save()

    res.status(200).json(generateResponse(true, "Job post deleted successfully"))
  } catch (error) {
    console.error("Delete job post error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const shareJobPost = async (req, res) => {
  try {
    const { id } = req.params
    const { platform } = req.body

    const jobPost = await JobPost.findById(id)
    if (!jobPost) {
      return res.status(404).json(generateResponse(false, "Job post not found"))
    }

    // Generate share URL
    const shareUrl = `${req.protocol}://${req.get("host")}/jobs/${id}`

    // Platform-specific share URLs
    const shareUrls = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(jobPost.title)}`,
      instagram: shareUrl, // Instagram doesn't support direct URL sharing
      email: `mailto:?subject=${encodeURIComponent(jobPost.title)}&body=${encodeURIComponent(`Check out this job opportunity: ${shareUrl}`)}`,
    }

    const response = {
      shareUrl,
      platformUrl: shareUrls[platform] || shareUrl,
      jobTitle: jobPost.title,
    }

    res.status(200).json(generateResponse(true, "Share URL generated successfully", response))
  } catch (error) {
    console.error("Share job post error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  createJobPost,
  getJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
  shareJobPost,
}
