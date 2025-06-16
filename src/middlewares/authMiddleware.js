const jwt = require("jsonwebtoken")
const { generateResponse } = require("../utils/responseHelper")
const User = require("../models/User")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json(generateResponse(false, "Access token is required"))
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json(generateResponse(false, "Invalid or expired token"))
    }
    req.user = user
    next()
  })
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(generateResponse(false, "Authentication required"))
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(generateResponse(false, "Insufficient permissions"))
    }

    next()
  }
}

const isAdmin = async (req, res, next) => {
  try {
    const { userId } = req.user

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return res.status(403).json(generateResponse(false, "Access denied. Admin privileges required"))
    }

    next()
  } catch (error) {
    console.error("Admin authorization error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  isAdmin,
}
