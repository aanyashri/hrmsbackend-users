const { generateResponse } = require("../utils/responseHelper")

// Mock employee database
const employees = [
  {
    id: 1,
    employeeId: "EMP001",
    name: "Kakashi Hatake",
    email: "kakashi@technorizen.com",
    role: "UI/UX Designer",
    department: "Design",
    phone: "+1234567890",
    joinDate: "2023-01-15",
    salary: 30000,
    isActive: true,
  },
  {
    id: 2,
    employeeId: "EMP002",
    name: "Naruto Uzumaki",
    email: "naruto@technorizen.com",
    role: "Frontend Developer",
    department: "Development",
    phone: "+1234567891",
    joinDate: "2023-02-01",
    salary: 28000,
    isActive: true,
  },
]

const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", department = "" } = req.query

    let filteredEmployees = employees.filter((emp) => emp.isActive)

    // Apply search filter
    if (search) {
      filteredEmployees = filteredEmployees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(search.toLowerCase()) ||
          emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
          emp.email.toLowerCase().includes(search.toLowerCase()),
      )
    }

    // Apply department filter
    if (department) {
      filteredEmployees = filteredEmployees.filter((emp) => emp.department.toLowerCase() === department.toLowerCase())
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + Number.parseInt(limit)
    const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

    const response = {
      employees: paginatedEmployees,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(filteredEmployees.length / limit),
        totalEmployees: filteredEmployees.length,
        hasNext: endIndex < filteredEmployees.length,
        hasPrev: startIndex > 0,
      },
    }

    res.status(200).json(generateResponse(true, "Employees retrieved successfully", response))
  } catch (error) {
    console.error("Get employees error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params
    const employee = employees.find((emp) => emp.id === Number.parseInt(id) && emp.isActive)

    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    res.status(200).json(generateResponse(true, "Employee retrieved successfully", employee))
  } catch (error) {
    console.error("Get employee error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const createEmployee = async (req, res) => {
  try {
    const { employeeId, name, email, role, department, phone, salary } = req.body

    if (!employeeId || !name || !email || !role) {
      return res.status(400).json(generateResponse(false, "Required fields are missing"))
    }

    // Check if employee already exists
    const existingEmployee = employees.find((emp) => emp.employeeId === employeeId || emp.email === email)

    if (existingEmployee) {
      return res.status(409).json(generateResponse(false, "Employee already exists"))
    }

    const newEmployee = {
      id: employees.length + 1,
      employeeId,
      name,
      email,
      role,
      department: department || "General",
      phone: phone || "",
      joinDate: new Date().toISOString().split("T")[0],
      salary: salary || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    employees.push(newEmployee)

    res.status(201).json(generateResponse(true, "Employee created successfully", newEmployee))
  } catch (error) {
    console.error("Create employee error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const employeeIndex = employees.findIndex((emp) => emp.id === Number.parseInt(id) && emp.isActive)

    if (employeeIndex === -1) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Update employee
    employees[employeeIndex] = {
      ...employees[employeeIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    res.status(200).json(generateResponse(true, "Employee updated successfully", employees[employeeIndex]))
  } catch (error) {
    console.error("Update employee error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params

    const employeeIndex = employees.findIndex((emp) => emp.id === Number.parseInt(id))

    if (employeeIndex === -1) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Soft delete
    employees[employeeIndex].isActive = false
    employees[employeeIndex].deletedAt = new Date().toISOString()

    res.status(200).json(generateResponse(true, "Employee deleted successfully"))
  } catch (error) {
    console.error("Delete employee error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
}
