const bcrypt = require("bcryptjs")
const { generateResponse } = require("../utils/responseHelper")
const { validateEmail, validatePhoneNumber } = require("../utils/validationHelper")
const { Employee, User } = require("../models")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/profiles")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."))
    }
  },
}).single("profilePicture")

/**
 * Upload middleware for profile pictures
 */
const uploadProfilePicture = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json(generateResponse(false, err.message))
    }
    next()
  })
}

/**
 * Get admin profile settings
 */
const getAdminProfile = async (req, res) => {
  try {
    const { userId } = req.user

    // Find admin user
    const user = await User.findById(userId).select("-password")
    if (!user) {
      return res.status(404).json(generateResponse(false, "Admin user not found"))
    }

    // Find associated employee record if exists
    const employee = await Employee.findOne({ userId: user._id })

    const profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      employeeId: employee?.employeeId || null,
      jobTitle: employee?.jobTitle || user.role,
      department: employee?.department || "Administration",
      phoneNumber: employee?.phoneNumber || user.phoneNumber,
      joiningDate: employee?.joiningDate || user.createdAt,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    res.status(200).json(generateResponse(true, "Admin profile retrieved successfully", profileData))
  } catch (error) {
    console.error("Get admin profile error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update admin profile
 */
const updateAdminProfile = async (req, res) => {
  try {
    const { userId } = req.user
    const { name, email, jobTitle, department, phoneNumber } = req.body

    // Find admin user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json(generateResponse(false, "Admin user not found"))
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json(generateResponse(false, "Invalid email format"))
    }

    // Validate phone if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json(generateResponse(false, "Invalid phone number format"))
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } })
      if (emailExists) {
        return res.status(409).json(generateResponse(false, "Email already exists"))
      }
    }

    // Update user profile
    if (name) user.name = name
    if (email) user.email = email
    if (phoneNumber) user.phoneNumber = phoneNumber

    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if exists
      if (user.profilePicture && user.profilePicture !== "/placeholder.svg?height=96&width=96") {
        const oldPicturePath = path.join(__dirname, "../uploads/profiles", path.basename(user.profilePicture))
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath)
        }
      }
      user.profilePicture = `/uploads/profiles/${req.file.filename}`
    }

    await user.save()

    // Update associated employee record if exists
    const employee = await Employee.findOne({ userId: user._id })
    if (employee) {
      if (jobTitle) employee.jobTitle = jobTitle
      if (department) employee.department = department
      if (phoneNumber) employee.phoneNumber = phoneNumber
      await employee.save()
    }

    // Return updated profile without password
    const updatedProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      employeeId: employee?.employeeId || null,
      jobTitle: employee?.jobTitle || user.role,
      department: employee?.department || "Administration",
      phoneNumber: user.phoneNumber,
      updatedAt: user.updatedAt,
    }

    res.status(200).json(generateResponse(true, "Admin profile updated successfully", updatedProfile))
  } catch (error) {
    console.error("Update admin profile error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Change admin password
 */
const changeAdminPassword = async (req, res) => {
  try {
    const { userId } = req.user
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json(generateResponse(false, "All password fields are required"))
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(generateResponse(false, "New passwords do not match"))
    }

    if (newPassword.length < 6) {
      return res.status(400).json(generateResponse(false, "New password must be at least 6 characters long"))
    }

    // Find admin user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json(generateResponse(false, "Admin user not found"))
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return res.status(400).json(generateResponse(false, "Current password is incorrect"))
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    user.password = hashedNewPassword
    user.updatedAt = new Date()
    await user.save()

    res.status(200).json(generateResponse(true, "Password changed successfully"))
  } catch (error) {
    console.error("Change admin password error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get admin account settings
 */
const getAdminAccountSettings = async (req, res) => {
  try {
    const { userId } = req.user

    // In a real application, these would be stored in a settings table
    const accountSettings = {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      twoFactorAuth: false,
      sessionTimeout: 30, // minutes
      language: "en",
      timezone: "UTC",
      theme: "light",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "24",
      autoLogout: true,
      loginAlerts: true,
    }

    res.status(200).json(generateResponse(true, "Account settings retrieved successfully", accountSettings))
  } catch (error) {
    console.error("Get admin account settings error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update admin account settings
 */
const updateAdminAccountSettings = async (req, res) => {
  try {
    const { userId } = req.user
    const settings = req.body

    // In a real application, you would save these settings to the database
    const updatedSettings = {
      emailNotifications: settings.emailNotifications ?? true,
      smsNotifications: settings.smsNotifications ?? false,
      pushNotifications: settings.pushNotifications ?? true,
      twoFactorAuth: settings.twoFactorAuth ?? false,
      sessionTimeout: settings.sessionTimeout ?? 30,
      language: settings.language ?? "en",
      timezone: settings.timezone ?? "UTC",
      theme: settings.theme ?? "light",
      dateFormat: settings.dateFormat ?? "YYYY-MM-DD",
      timeFormat: settings.timeFormat ?? "24",
      autoLogout: settings.autoLogout ?? true,
      loginAlerts: settings.loginAlerts ?? true,
      updatedAt: new Date().toISOString(),
    }

    res.status(200).json(generateResponse(true, "Account settings updated successfully", updatedSettings))
  } catch (error) {
    console.error("Update admin account settings error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  uploadProfilePicture,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAdminAccountSettings,
  updateAdminAccountSettings,
}
