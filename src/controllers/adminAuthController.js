const jwt = require("jsonwebtoken")
const { generateResponse } = require("../utils/responseHelper")
const { User, Employee } = require("../models")

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json(generateResponse(false, "Email and password are required"))
    }

    // Find user with employee data
    const user = await User.findOne({ email, isActive: true }).populate("employee")

    if (!user) {
      return res.status(401).json(generateResponse(false, "Invalid credentials"))
    }

    // Check if user has admin/HR role
    if (!user.employee || !["HR", "Admin", "Manager"].includes(user.employee.role)) {
      return res.status(403).json(generateResponse(false, "Access denied. Admin privileges required."))
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json(generateResponse(false, "Invalid credentials"))
    }

    // Update last login
    user.lastLoginAt = new Date()
    await user.save()

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        employeeId: user.employee?.employeeId,
        email: user.email,
        role: user.employee?.role,
        isAdmin: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }, // Shorter session for admin
    )

    const userData = {
      id: user._id,
      employeeId: user.employee?.employeeId,
      email: user.email,
      name: user.name,
      role: user.employee?.role,
      department: user.employee?.department,
      profilePicture: user.profilePicture,
      isAdmin: true,
    }

    res.status(200).json(
      generateResponse(true, "Admin login successful", {
        user: userData,
        token,
      }),
    )
  } catch (error) {
    console.error("Admin login error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("employee")

    if (!user) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    const userData = {
      id: user._id,
      employeeId: user.employee?.employeeId,
      email: user.email,
      name: user.name,
      role: user.employee?.role,
      department: user.employee?.department,
      phone: user.phone,
      profilePicture: user.profilePicture,
      isAdmin: true,
      permissions: getAdminPermissions(user.employee?.role),
    }

    res.status(200).json(generateResponse(true, "Admin profile retrieved successfully", userData))
  } catch (error) {
    console.error("Get admin profile error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getAdminPermissions = (role) => {
  const permissions = {
    HR: [
      "view_dashboard",
      "manage_employees",
      "manage_schedules",
      "manage_job_posts",
      "view_reports",
      "manage_leaves",
      "manage_payroll",
    ],
    Admin: [
      "view_dashboard",
      "manage_employees",
      "manage_schedules",
      "manage_job_posts",
      "view_reports",
      "manage_leaves",
      "manage_payroll",
      "manage_users",
      "system_settings",
    ],
    Manager: ["view_dashboard", "view_employees", "manage_schedules", "view_reports", "approve_leaves"],
  }

  return permissions[role] || []
}

module.exports = {
  adminLogin,
  getAdminProfile,
}
