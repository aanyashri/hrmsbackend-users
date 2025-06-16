const bcrypt = require("bcryptjs")
const { generateResponse } = require("../utils/responseHelper")
const { validateEmail, validatePhoneNumber } = require("../utils/validationHelper")

// Import users from auth controller (in real app, this would be from database)
const users = [
  {
    id: 1,
    employeeId: "EMP001",
    email: "kakashi@technorizen.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    name: "Kakashi Hatake",
    role: "UI/UX Designer",
    department: "Design",
    phone: "+1234567890",
    joinDate: "2023-01-15",
    dateOfBirth: "1990-05-15",
    address: "123 Main Street, City, State",
    emergencyContact: "+1234567899",
    profilePicture: "/placeholder.svg?height=96&width=96",
    isActive: true,
    createdAt: "2023-01-15T00:00:00.000Z",
  },
]

const getMyProfile = async (req, res) => {
  try {
    const { userId } = req.user
    const user = users.find((u) => u.id === userId && u.isActive)

    if (!user) {
      return res.status(404).json(generateResponse(false, "Profile not found"))
    }

    // Return profile without password
    const profileData = {
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      joinDate: user.joinDate,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      emergencyContact: user.emergencyContact,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    }

    res.status(200).json(generateResponse(true, "Profile retrieved successfully", profileData))
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user
    const updates = req.body

    const userIndex = users.findIndex((u) => u.id === userId && u.isActive)

    if (userIndex === -1) {
      return res.status(404).json(generateResponse(false, "Profile not found"))
    }

    // Validate email if provided
    if (updates.email && !validateEmail(updates.email)) {
      return res.status(400).json(generateResponse(false, "Invalid email format"))
    }

    // Validate phone if provided
    if (updates.phone && !validatePhoneNumber(updates.phone)) {
      return res.status(400).json(generateResponse(false, "Invalid phone number format"))
    }

    // Check if email is already taken by another user
    if (updates.email) {
      const emailExists = users.find((u) => u.email === updates.email && u.id !== userId)
      if (emailExists) {
        return res.status(409).json(generateResponse(false, "Email already exists"))
      }
    }

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password
    delete updates.employeeId
    delete updates.role
    delete updates.department
    delete updates.isActive

    // Update user profile
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Return updated profile without password
    const updatedProfile = {
      id: users[userIndex].id,
      employeeId: users[userIndex].employeeId,
      email: users[userIndex].email,
      name: users[userIndex].name,
      role: users[userIndex].role,
      department: users[userIndex].department,
      phone: users[userIndex].phone,
      joinDate: users[userIndex].joinDate,
      dateOfBirth: users[userIndex].dateOfBirth,
      address: users[userIndex].address,
      emergencyContact: users[userIndex].emergencyContact,
      profilePicture: users[userIndex].profilePicture,
    }

    res.status(200).json(generateResponse(true, "Profile updated successfully", updatedProfile))
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const changePassword = async (req, res) => {
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

    const userIndex = users.findIndex((u) => u.id === userId && u.isActive)

    if (userIndex === -1) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[userIndex].password)
    if (!isCurrentPasswordValid) {
      return res.status(400).json(generateResponse(false, "Current password is incorrect"))
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    users[userIndex].password = hashedNewPassword
    users[userIndex].updatedAt = new Date().toISOString()

    res.status(200).json(generateResponse(true, "Password changed successfully"))
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateProfilePicture = async (req, res) => {
  try {
    const { userId } = req.user
    const { profilePicture } = req.body

    if (!profilePicture) {
      return res.status(400).json(generateResponse(false, "Profile picture URL is required"))
    }

    const userIndex = users.findIndex((u) => u.id === userId && u.isActive)

    if (userIndex === -1) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    // Update profile picture
    users[userIndex].profilePicture = profilePicture
    users[userIndex].updatedAt = new Date().toISOString()

    res.status(200).json(
      generateResponse(true, "Profile picture updated successfully", {
        profilePicture: users[userIndex].profilePicture,
      }),
    )
  } catch (error) {
    console.error("Update profile picture error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getAccountSettings = async (req, res) => {
  try {
    const { userId } = req.user
    const user = users.find((u) => u.id === userId && u.isActive)

    if (!user) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    const accountSettings = {
      emailNotifications: true,
      smsNotifications: false,
      twoFactorAuth: false,
      profileVisibility: "public",
      language: "en",
      timezone: "UTC",
    }

    res.status(200).json(generateResponse(true, "Account settings retrieved successfully", accountSettings))
  } catch (error) {
    console.error("Get account settings error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateAccountSettings = async (req, res) => {
  try {
    const { userId } = req.user
    const settings = req.body

    const user = users.find((u) => u.id === userId && u.isActive)

    if (!user) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    // In a real application, you would save these settings to the database
    const updatedSettings = {
      emailNotifications: settings.emailNotifications ?? true,
      smsNotifications: settings.smsNotifications ?? false,
      twoFactorAuth: settings.twoFactorAuth ?? false,
      profileVisibility: settings.profileVisibility ?? "public",
      language: settings.language ?? "en",
      timezone: settings.timezone ?? "UTC",
      updatedAt: new Date().toISOString(),
    }

    res.status(200).json(generateResponse(true, "Account settings updated successfully", updatedSettings))
  } catch (error) {
    console.error("Update account settings error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getMyProfile,
  updateProfile,
  changePassword,
  updateProfilePicture,
  getAccountSettings,
  updateAccountSettings,
}
