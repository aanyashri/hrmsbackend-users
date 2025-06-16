const { generateResponse } = require("../utils/responseHelper")
const { Policy } = require("../models")
const mongoose = require("mongoose")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const { v4: uuidv4 } = require("uuid")

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/policies")

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueFilename)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX, and common image formats
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, DOCX, JPEG, and PNG files are allowed."))
    }
  },
}).array("attachments", 5) // Allow up to 5 files

/**
 * Upload middleware
 */
const uploadFiles = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json(generateResponse(false, err.message))
    }
    next()
  })
}

/**
 * Get all policies with filtering
 */
const getAllPolicies = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query

    // Build query
    const query = {}

    // Filter by category if provided
    if (category) {
      query.category = category
    }

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Search by title or description
    if (search) {
      query.$or = [{ title: new RegExp(search, "i") }, { description: new RegExp(search, "i") }]
    }

    // Count total records
    const totalRecords = await Policy.countDocuments(query)

    // Get paginated records
    const policies = await Policy.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const response = {
      policies,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Policies retrieved successfully", response))
  } catch (error) {
    console.error("Get policies error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Create a new policy
 */
const createPolicy = async (req, res) => {
  try {
    const { title, description, category, content, effectiveDate, expiryDate } = req.body

    if (!title || !description || !category) {
      return res.status(400).json(generateResponse(false, "Title, description and category are required"))
    }

    // Process uploaded files
    const attachments = []
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        })
      })
    }

    // Create new policy
    const newPolicy = new Policy({
      title,
      description,
      category,
      content,
      attachments,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: "active",
      version: "1.0",
      createdBy: req.user.id,
    })

    await newPolicy.save()

    res.status(201).json(generateResponse(true, "Policy created successfully", newPolicy))
  } catch (error) {
    console.error("Create policy error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update a policy
 */
const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, category, content, effectiveDate, expiryDate, status } = req.body

    const policy = await Policy.findById(id)

    if (!policy) {
      return res.status(404).json(generateResponse(false, "Policy not found"))
    }

    // Update fields
    if (title) policy.title = title
    if (description) policy.description = description
    if (category) policy.category = category
    if (content) policy.content = content
    if (effectiveDate) policy.effectiveDate = new Date(effectiveDate)
    if (expiryDate) policy.expiryDate = new Date(expiryDate)
    if (status) policy.status = status

    // Process new uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        policy.attachments.push({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        })
      })
    }

    // Update version and metadata
    const currentVersion = Number.parseFloat(policy.version)
    policy.version = (currentVersion + 0.1).toFixed(1)
    policy.updatedBy = req.user.id
    policy.updatedAt = new Date()

    await policy.save()

    res.status(200).json(generateResponse(true, "Policy updated successfully", policy))
  } catch (error) {
    console.error("Update policy error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Delete a policy
 */
const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params

    const policy = await Policy.findById(id)

    if (!policy) {
      return res.status(404).json(generateResponse(false, "Policy not found"))
    }

    // Delete associated files
    policy.attachments.forEach((attachment) => {
      if (fs.existsSync(attachment.path)) {
        fs.unlinkSync(attachment.path)
      }
    })

    // Delete policy
    await Policy.findByIdAndDelete(id)

    res.status(200).json(generateResponse(true, "Policy deleted successfully"))
  } catch (error) {
    console.error("Delete policy error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Download policy attachment
 */
const downloadPolicyAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params

    const policy = await Policy.findById(id)

    if (!policy) {
      return res.status(404).json(generateResponse(false, "Policy not found"))
    }

    const attachment = policy.attachments.id(attachmentId)

    if (!attachment) {
      return res.status(404).json(generateResponse(false, "Attachment not found"))
    }

    // Check if file exists
    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json(generateResponse(false, "File not found"))
    }

    // Set appropriate headers
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.filename}"`)
    res.setHeader("Content-Type", attachment.mimetype)

    // Stream the file
    const fileStream = fs.createReadStream(attachment.path)
    fileStream.pipe(res)
  } catch (error) {
    console.error("Download attachment error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Remove policy attachment
 */
const removePolicyAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params

    const policy = await Policy.findById(id)

    if (!policy) {
      return res.status(404).json(generateResponse(false, "Policy not found"))
    }

    const attachment = policy.attachments.id(attachmentId)

    if (!attachment) {
      return res.status(404).json(generateResponse(false, "Attachment not found"))
    }

    // Delete file from filesystem
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path)
    }

    // Remove attachment from policy
    policy.attachments.pull(attachmentId)
    policy.updatedBy = req.user.id
    policy.updatedAt = new Date()

    await policy.save()

    res.status(200).json(generateResponse(true, "Attachment removed successfully", policy))
  } catch (error) {
    console.error("Remove attachment error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get policy categories
 */
const getPolicyCategories = async (req, res) => {
  try {
    const categories = await Policy.distinct("category")

    res.status(200).json(generateResponse(true, "Policy categories retrieved successfully", categories))
  } catch (error) {
    console.error("Get policy categories error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get policy statistics
 */
const getPolicyStatistics = async (req, res) => {
  try {
    // Get total policies
    const totalPolicies = await Policy.countDocuments()

    // Get policies by status
    const activePolicies = await Policy.countDocuments({ status: "active" })
    const draftPolicies = await Policy.countDocuments({ status: "draft" })
    const expiredPolicies = await Policy.countDocuments({
      status: "active",
      expiryDate: { $lt: new Date() },
    })

    // Get policies by category
    const policiesByCategory = await Policy.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    // Get recent policies
    const recentPolicies = await Policy.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title category status createdAt createdBy")

    const stats = {
      totalPolicies,
      activePolicies,
      draftPolicies,
      expiredPolicies,
      policiesByCategory,
      recentPolicies,
    }

    res.status(200).json(generateResponse(true, "Policy statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get policy statistics error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  uploadFiles,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  downloadPolicyAttachment,
  removePolicyAttachment,
  getPolicyCategories,
  getPolicyStatistics,
}
