const jwt = require("jsonwebtoken")
const { generateResponse } = require("../utils/responseHelper")
const { User, Employee, ProfileSettings } = require("../models")
const { sendEmail } = require("../utils/emailService") // adjust path if needed

const login = async (req, res) => {
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
        role: user.employee?.role || "Employee",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    )

    const userData = {
      id: user._id,
      employeeId: user.employee?.employeeId,
      email: user.email,
      name: user.name,
      role: user.employee?.role,
      department: user.employee?.department,
      profilePicture: user.profilePicture,
    }

    res.status(200).json(
      generateResponse(true, "Login successful", {
        user: userData,
        token,
      }),
    )
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const register = async (req, res) => {
  try {
    const { employeeId, email, password, name, role, department, phone } = req.body

    if (!employeeId || !email || !password || !name) {
      return res.status(400).json(generateResponse(false, "All required fields must be provided"))
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json(generateResponse(false, "Email already exists"))
    }

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ employeeId })
    if (existingEmployee) {
      return res.status(409).json(generateResponse(false, "Employee ID already exists"))
    }

    // Create user
    const newUser = new User({
      email,
      password,
      name,
      phone: phone || null,
    })

    await newUser.save()

    // Create employee
    const newEmployee = new Employee({
      employeeId,
      userId: newUser._id,
      role: role || "Employee",
      department: department || "General",
    })

    await newEmployee.save()

    // Create default profile settings
    const profileSettings = new ProfileSettings({
      userId: newUser._id,
    })

    await profileSettings.save()

    const userData = {
      id: newUser._id,
      employeeId: newEmployee.employeeId,
      email: newUser.email,
      name: newUser.name,
      role: newEmployee.role,
      department: newEmployee.department,
      profilePicture: newUser.profilePicture,
    }

    res.status(201).json(generateResponse(true, "User registered successfully", userData))
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getProfile = async (req, res) => {
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
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      emergencyContact: user.emergencyContact,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
      joinDate: user.employee?.joinDate,
    }

    res.status(200).json(generateResponse(true, "Profile retrieved successfully", userData))
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json(generateResponse(false, "Email is required"))
    }

    // Find user by email
    const user = await User.findOne({ email, isActive: true })

    if (!user) {
      return res.status(404).json(generateResponse(false, "User not found"))
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })

    // Save reset token to user
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = Date.now() + 3600000 // 1 hour
    await user.save()

    // In a real application, send email with reset link
    // For now, just return the token
    // res.status(200).json(
    //   generateResponse(true, "Password reset instructions sent to your email", {
    //     resetToken,
    //     // In production, don't return the token, just send it via email
    //   }),
    // )

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

await sendEmail(
  user.email,
  "Password Reset Instructions",
  `You requested a password reset. Click the link below to reset your password:\n${resetLink}`,
  `<p>You requested a password reset.</p><p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
)

res.status(200).json(generateResponse(true, "Password reset instructions sent to your email"))

  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json(generateResponse(false, "Token and new password are required"))
    }

    // Verify token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(400).json(generateResponse(false, "Invalid or expired token"))
    }

    // Find user by token
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
      isActive: true,
    })

    if (!user) {
      return res.status(400).json(generateResponse(false, "Invalid or expired token"))
    }

    // Update password
    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.status(200).json(generateResponse(true, "Password has been reset successfully"))
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  login,
  register,
  getProfile,
  forgotPassword,
  resetPassword,
}
