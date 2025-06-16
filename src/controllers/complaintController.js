const { generateResponse } = require("../utils/responseHelper")
const { Complaint, Employee } = require("../models")

const submitComplaint = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { complaintType, subject, description, priority, isAnonymous } = req.body

    if (!complaintType || !subject || !description) {
      return res.status(400).json(generateResponse(false, "All required fields must be provided"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const complaint = new Complaint({
      employeeId: employee._id,
      complaintType,
      subject,
      description,
      priority: priority || "medium",
      isAnonymous: isAnonymous || false,
    })

    await complaint.save()
    await complaint.populate("employee")

    res.status(201).json(generateResponse(true, "Complaint submitted successfully", complaint))
  } catch (error) {
    console.error("Submit complaint error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getMyComplaints = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { status, complaintType, page = 1, limit = 10 } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Build query
    const query = { employeeId: employee._id }

    if (status) {
      query.status = status
    }

    if (complaintType) {
      query.complaintType = complaintType
    }

    // Get total count
    const totalComplaints = await Complaint.countDocuments(query)

    // Get paginated complaints
    const complaints = await Complaint.find(query)
      .populate("employee")
      .populate("assignedTo")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    const response = {
      complaints,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalComplaints / limit),
        totalComplaints,
        hasNext: page * limit < totalComplaints,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Complaints retrieved successfully", response))
  } catch (error) {
    console.error("Get complaints error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const complaint = await Complaint.findOne({
      _id: id,
      employeeId: employee._id,
    })
      .populate("employee")
      .populate("assignedTo")
      .populate("investigationNotes.addedBy")

    if (!complaint) {
      return res.status(404).json(generateResponse(false, "Complaint not found"))
    }

    res.status(200).json(generateResponse(true, "Complaint retrieved successfully", complaint))
  } catch (error) {
    console.error("Get complaint error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getComplaintTypes = async (req, res) => {
  try {
    const complaintTypes = [
      "Salary Issue",
      "Workplace Harassment",
      "Discrimination",
      "Work Environment",
      "Management Issues",
      "Policy Violation",
      "Safety Concerns",
      "Benefits Issue",
      "Other",
    ]

    res.status(200).json(generateResponse(true, "Complaint types retrieved successfully", complaintTypes))
  } catch (error) {
    console.error("Get complaint types error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintTypes,
}
