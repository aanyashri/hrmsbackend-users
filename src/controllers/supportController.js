const { generateResponse } = require("../utils/responseHelper")
const { SupportTicket, Employee } = require("../models")

const createSupportTicket = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { category, subject, description, priority } = req.body

    if (!category || !subject || !description) {
      return res.status(400).json(generateResponse(false, "All required fields must be provided"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const supportTicket = new SupportTicket({
      employeeId: employee._id,
      category,
      subject,
      description,
      priority: priority || "medium",
    })

    await supportTicket.save()
    await supportTicket.populate("employee")

    res.status(201).json(generateResponse(true, "Support ticket created successfully", supportTicket))
  } catch (error) {
    console.error("Create support ticket error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getMySupportTickets = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { status, category, page = 1, limit = 10 } = req.query

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

    if (category) {
      query.category = category
    }

    // Get total count
    const totalTickets = await SupportTicket.countDocuments(query)

    // Get paginated tickets
    const tickets = await SupportTicket.find(query)
      .populate("employee")
      .populate("assignedTo")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    const response = {
      tickets,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalTickets / limit),
        totalTickets,
        hasNext: page * limit < totalTickets,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Support tickets retrieved successfully", response))
  } catch (error) {
    console.error("Get support tickets error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getSupportTicketById = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const ticket = await SupportTicket.findOne({
      _id: id,
      employeeId: employee._id,
    })
      .populate("employee")
      .populate("assignedTo")
      .populate("responses.responderId")

    if (!ticket) {
      return res.status(404).json(generateResponse(false, "Support ticket not found"))
    }

    res.status(200).json(generateResponse(true, "Support ticket retrieved successfully", ticket))
  } catch (error) {
    console.error("Get support ticket error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const addTicketResponse = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user
    const { message } = req.body

    if (!message) {
      return res.status(400).json(generateResponse(false, "Message is required"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const ticket = await SupportTicket.findOne({
      _id: id,
      employeeId: employee._id,
    })

    if (!ticket) {
      return res.status(404).json(generateResponse(false, "Support ticket not found"))
    }

    ticket.responses.push({
      responderId: employee._id,
      message,
      timestamp: new Date(),
    })

    await ticket.save()
    await ticket.populate("responses.responderId")

    res.status(200).json(generateResponse(true, "Response added successfully", ticket))
  } catch (error) {
    console.error("Add ticket response error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getHRContactInfo = async (req, res) => {
  try {
    const hrContactInfo = {
      hrNumber: "8569741236",
      hrEmail: "hr@technorizen.com",
      supportHours: "Monday - Friday, 9:00 AM - 6:00 PM",
      emergencyContact: "+1-800-HRHELP",
      categories: [
        "Leave and Attendance",
        "Payroll and Salary",
        "Technical Issues",
        "HR Policies",
        "Account Access",
        "General Inquiry",
        "Other",
      ],
    }

    res.status(200).json(generateResponse(true, "HR contact information retrieved successfully", hrContactInfo))
  } catch (error) {
    console.error("Get HR contact info error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getSupportTicketById,
  addTicketResponse,
  getHRContactInfo,
}
