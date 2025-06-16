const moment = require("moment")

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[\d\s\-$$$$]{10,}$/
  return phoneRegex.test(phone)
}

const validateEmployeeId = (employeeId) => {
  const empIdRegex = /^EMP\d{3,}$/
  return empIdRegex.test(employeeId)
}

const validateDate = (date) => {
  return moment(date, "YYYY-MM-DD", true).isValid()
}

const sanitizeInput = (input) => {
  if (typeof input !== "string") return input
  return input.trim().replace(/[<>]/g, "")
}

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateEmployeeId,
  validateDate,
  sanitizeInput,
}
