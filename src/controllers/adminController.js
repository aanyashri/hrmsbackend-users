const { generateResponse } = require("../utils/responseHelper")
const { User, Employee, Attendance, LeaveRequest, Payroll, Schedule, JobPost } = require("../models")
const moment = require("moment")

const getDashboardStats = async (req, res) => {
  try {
    // Get total employees
    const totalEmployees = await Employee.countDocuments({ isActive: true })

    // Get total salary (current month)
    const currentMonth = moment().month() + 1
    const currentYear = moment().year()
    const totalSalary = await Payroll.aggregate([
      {
        $match: {
          month: currentMonth,
          year: currentYear,
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$netSalary" },
        },
      },
    ])

    // Get active job posts
    const activeJobPosts = await JobPost.countDocuments({ isActive: true })

    // Get recent employees (this month)
    const startOfMonth = moment().startOf("month").toDate()
    const newHiresThisMonth = await Employee.find({
      joinDate: { $gte: startOfMonth },
      isActive: true,
    })
      .populate("userId", "name email profilePicture")
      .limit(5)

    // Get today's schedule
    const today = moment().format("YYYY-MM-DD")
    const todaySchedule = await Schedule.find({
      date: today,
      isActive: true,
    })
      .populate("employeeId", "employeeId")
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          select: "name",
        },
      })

    // Get work hours data for chart (last 7 days)
    const workHoursData = []
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, "days").format("YYYY-MM-DD")
      const dayAttendance = await Attendance.aggregate([
        {
          $match: {
            date: new Date(date),
          },
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: "$workingHours" },
          },
        },
      ])

      workHoursData.push({
        date,
        hours: dayAttendance[0]?.totalHours || 0,
      })
    }

    // Get employees on leave today
    const employeesOnLeave = await LeaveRequest.find({
      startDate: { $lte: new Date(today) },
      endDate: { $gte: new Date(today) },
      status: "approved",
    }).populate({
      path: "employeeId",
      populate: {
        path: "userId",
        select: "name profilePicture",
      },
    })

    const dashboardData = {
      stats: {
        totalEmployees,
        totalSalary: totalSalary[0]?.total || 0,
        activeJobPosts,
        employeesOnLeave: employeesOnLeave.length,
      },
      newHires: newHiresThisMonth.map((emp) => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.userId.name,
        email: emp.userId.email,
        profilePicture: emp.userId.profilePicture,
        role: emp.role,
        department: emp.department,
        joinDate: emp.joinDate,
        hiringDate: moment(emp.joinDate).format("MMM DD, YYYY"),
      })),
      todaySchedule: todaySchedule.map((schedule) => ({
        id: schedule._id,
        title: schedule.title,
        time: schedule.time,
        type: schedule.type,
        employee: schedule.employeeId
          ? {
              name: schedule.employeeId.userId.name,
              employeeId: schedule.employeeId.employeeId,
            }
          : null,
      })),
      workHoursChart: workHoursData,
      employeesOnLeave: employeesOnLeave.map((leave) => ({
        employee: {
          name: leave.employeeId.userId.name,
          profilePicture: leave.employeeId.userId.profilePicture,
        },
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
      })),
    }

    res.status(200).json(generateResponse(true, "Dashboard data retrieved successfully", dashboardData))
  } catch (error) {
    console.error("Get dashboard stats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getEmployeesList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      status = "",
      location = "",
      sortBy = "joinDate",
      sortOrder = "desc",
    } = req.query

    // Build query
    const query = {}

    if (status) {
      query.isActive = status === "active"
    }

    if (department) {
      query.department = new RegExp(department, "i")
    }

    if (location) {
      query.workLocation = new RegExp(location, "i")
    }

    // Get employees with user data
    let employeesQuery = Employee.find(query).populate({
      path: "userId",
      select: "name email phone profilePicture",
    })

    // Apply search filter
    if (search) {
      const searchRegex = new RegExp(search, "i")
      const users = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id")

      const userIds = users.map((user) => user._id)
      query.$or = [{ employeeId: searchRegex }, { userId: { $in: userIds } }]

      employeesQuery = Employee.find(query).populate({
        path: "userId",
        select: "name email phone profilePicture",
      })
    }

    // Apply sorting
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1
    employeesQuery = employeesQuery.sort(sortOptions)

    // Get total count
    const totalEmployees = await Employee.countDocuments(query)

    // Apply pagination
    const employees = await employeesQuery.limit(Number.parseInt(limit)).skip((page - 1) * limit)

    // Format employees data
    const formattedEmployees = employees.map((emp) => ({
      id: emp._id,
      employeeId: emp.employeeId,
      name: emp.userId.name,
      email: emp.userId.email,
      phone: emp.userId.phone,
      profilePicture: emp.userId.profilePicture,
      role: emp.role,
      department: emp.department,
      workLocation: emp.workLocation,
      joinDate: emp.joinDate,
      joiningDate: moment(emp.joinDate).format("DD MMM YYYY"),
      status: emp.isActive ? "Active" : "Inactive",
      salary: emp.salary,
    }))

    // Get summary stats
    const stats = {
      allEmployees: await Employee.countDocuments(),
      active: await Employee.countDocuments({ isActive: true }),
      inactive: await Employee.countDocuments({ isActive: false }),
      newEmployees: await Employee.countDocuments({
        joinDate: { $gte: moment().startOf("month").toDate() },
      }),
      departments: await Employee.distinct("department"),
      employeesOnLeave: await LeaveRequest.countDocuments({
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        status: "approved",
      }),
    }

    const response = {
      employees: formattedEmployees,
      stats,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalEmployees / limit),
        totalEmployees,
        hasNext: page * limit < totalEmployees,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Employees retrieved successfully", response))
  } catch (error) {
    console.error("Get employees list error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, email, jobTitle, location, joiningDate, status, department, salary } =
      req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !jobTitle) {
      return res.status(400).json(generateResponse(false, "Required fields are missing"))
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json(generateResponse(false, "Email already exists"))
    }

    // Generate employee ID
    const employeeCount = await Employee.countDocuments()
    const employeeId = `EMP${String(employeeCount + 1).padStart(3, "0")}`

    // Create user
    const newUser = new User({
      email,
      password: "password123", // Default password
      name: `${firstName} ${lastName}`,
      phone: contactNumber,
    })
    await newUser.save()

    // Create employee
    const newEmployee = new Employee({
      employeeId,
      userId: newUser._id,
      role: jobTitle,
      department: department || "General",
      workLocation: location || "Office",
      joinDate: joiningDate ? new Date(joiningDate) : new Date(),
      salary: salary || 0,
      isActive: status === "Active",
    })
    await newEmployee.save()

    // Populate user data for response
    await newEmployee.populate("userId", "name email phone profilePicture")

    const employeeData = {
      id: newEmployee._id,
      employeeId: newEmployee.employeeId,
      name: newEmployee.userId.name,
      email: newEmployee.userId.email,
      phone: newEmployee.userId.phone,
      role: newEmployee.role,
      department: newEmployee.department,
      workLocation: newEmployee.workLocation,
      joinDate: newEmployee.joinDate,
      salary: newEmployee.salary,
      status: newEmployee.isActive ? "Active" : "Inactive",
    }

    res.status(201).json(generateResponse(true, "Employee created successfully", employeeData))
  } catch (error) {
    console.error("Create employee error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const employee = await Employee.findById(id)
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    employee.isActive = status === "Active"
    await employee.save()

    res.status(200).json(generateResponse(true, "Employee status updated successfully"))
  } catch (error) {
    console.error("Update employee status error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getDashboardStats,
  getEmployeesList,
  createEmployee,
  updateEmployeeStatus,
}
