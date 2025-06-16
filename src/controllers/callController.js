const { generateResponse } = require("../utils/responseHelper")
const { Call, Employee, Chat } = require("../models")

const initiateCall = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { participantEmployeeId, callType } = req.body

    if (!participantEmployeeId || !callType) {
      return res.status(400).json(generateResponse(false, "Participant and call type are required"))
    }

    // Find both employees
    const [initiator, participant] = await Promise.all([
      Employee.findOne({ employeeId, isActive: true }),
      Employee.findOne({ employeeId: participantEmployeeId, isActive: true }),
    ])

    if (!initiator || !participant) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Create or get existing chat
    let chat = await Chat.findOne({
      participants: { $all: [initiator._id, participant._id] },
      chatType: "direct",
    })

    if (!chat) {
      chat = new Chat({
        participants: [initiator._id, participant._id],
        chatType: "direct",
      })
      await chat.save()
    }

    // Create call record
    const call = new Call({
      callType,
      initiatorId: initiator._id,
      participantId: participant._id,
      status: "initiated",
      chatId: chat._id,
      metadata: {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        deviceType: req.headers["x-device-type"] || "unknown",
      },
    })

    await call.save()
    await call.populate("initiator participant")

    res.status(201).json(generateResponse(true, "Call initiated successfully", call))
  } catch (error) {
    console.error("Initiate call error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params
    const { status, quality } = req.body

    const call = await Call.findById(callId)

    if (!call) {
      return res.status(404).json(generateResponse(false, "Call not found"))
    }

    // Update call status
    call.status = status

    if (status === "ended") {
      call.endTime = new Date()
    }

    if (quality) {
      call.quality = quality
    }

    await call.save()
    await call.populate("initiator participant")

    res.status(200).json(generateResponse(true, "Call status updated successfully", call))
  } catch (error) {
    console.error("Update call status error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getCallHistory = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { page = 1, limit = 20, callType } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Build query
    const query = {
      $or: [{ initiatorId: employee._id }, { participantId: employee._id }],
    }

    if (callType) {
      query.callType = callType
    }

    // Get total count
    const totalCalls = await Call.countDocuments(query)

    // Get paginated calls
    const calls = await Call.find(query)
      .populate("initiator participant")
      .sort({ startTime: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    const response = {
      calls,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalCalls / limit),
        totalCalls,
        hasNext: page * limit < totalCalls,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Call history retrieved successfully", response))
  } catch (error) {
    console.error("Get call history error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getActiveCall = async (req, res) => {
  try {
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const activeCall = await Call.findOne({
      $or: [{ initiatorId: employee._id }, { participantId: employee._id }],
      status: { $in: ["initiated", "ringing", "answered"] },
    })
      .populate("initiator participant")
      .populate("chatId")

    if (!activeCall) {
      return res.status(404).json(generateResponse(false, "No active call found"))
    }

    res.status(200).json(generateResponse(true, "Active call retrieved successfully", activeCall))
  } catch (error) {
    console.error("Get active call error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  initiateCall,
  updateCallStatus,
  getCallHistory,
  getActiveCall,
}
