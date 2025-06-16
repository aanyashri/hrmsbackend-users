const { generateResponse } = require("../utils/responseHelper")
const { Policy, Employee } = require("../models")
const path = require("path")
const fs = require("fs")

const getAllPolicies = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query

    // Build query
    const query = { isActive: true }

    // Apply category filter
    if (category) {
      query.category = new RegExp(category, "i")
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { content: new RegExp(search, "i") },
      ]
    }

    // Get total count
    const totalPolicies = await Policy.countDocuments(query)

    // Get paginated policies
    const policies = await Policy.find(query)
      .populate("createdBy")
      .populate("approvedBy")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    // Format policies for frontend
    const formattedPolicies = policies.map((policy) => ({
      id: policy._id,
      title: policy.title,
      category: policy.category,
      description: policy.description,
      version: policy.version,
      effectiveDate: policy.effectiveDate,
      expiryDate: policy.expiryDate,
      isActive: policy.isActive,
      createdAt: policy.createdAt,
      attachments: policy.attachments,
      // Generate download filename
      filename: `${policy.title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      fileSize: "2.5 MB", // Mock file size
      downloadUrl: `/api/policies/${policy._id}/download`,
    }))

    const response = {
      policies: formattedPolicies,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalPolicies / limit),
        totalPolicies,
        hasNext: page * limit < totalPolicies,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Policies retrieved successfully", response))
  } catch (error) {
    console.error("Get policies error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params

    const policy = await Policy.findOne({ _id: id, isActive: true }).populate("createdBy").populate("approvedBy")

    if (!policy) {
      return res.status(404).json(generateResponse(false, "Policy not found"))
    }

    res.status(200).json(generateResponse(true, "Policy retrieved successfully", policy))
  } catch (error) {
    console.error("Get policy error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const downloadPolicy = async (req, res) => {
  try {
    const { id } = req.params

    const policy = await Policy.findOne({ _id: id, isActive: true })

    if (!policy) {
      return res.status(404).json(generateResponse(false, "Policy not found"))
    }

    // In a real application, you would serve the actual file
    // For now, we'll return policy content as downloadable text
    const filename = `${policy.title.toLowerCase().replace(/\s+/g, "-")}.pdf`

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)

    // Mock PDF content - in real app, serve actual PDF file
    const pdfContent = `
      COMPANY POLICY DOCUMENT
      
      Title: ${policy.title}
      Category: ${policy.category}
      Version: ${policy.version}
      Effective Date: ${policy.effectiveDate}
      
      Description:
      ${policy.description}
      
      Content:
      ${policy.content}
      
      ---
      This is a mock PDF download. In production, serve actual PDF files.
    `

    res.send(pdfContent)
  } catch (error) {
    console.error("Download policy error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getPolicyCategories = async (req, res) => {
  try {
    const categories = await Policy.distinct("category", { isActive: true })

    res.status(200).json(generateResponse(true, "Policy categories retrieved successfully", categories))
  } catch (error) {
    console.error("Get policy categories error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllPolicies,
  getPolicyById,
  downloadPolicy,
  getPolicyCategories,
}
