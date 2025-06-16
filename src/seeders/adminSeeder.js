const bcrypt = require("bcryptjs")
const { User, Employee, Schedule, JobPost } = require("../models")

const seedAdminData = async () => {
  try {
    console.log("👨‍💼 Seeding admin data...")

    // Create HR Admin user
    const hashedPassword = await bcrypt.hash("admin123", 12)

    const adminUser = new User({
      email: "admin@technorizen.com",
      password: hashedPassword,
      name: "HR Administrator",
      phone: "+1234567800",
      profilePicture: "/placeholder.svg?height=96&width=96",
    })
    await adminUser.save()

    // Create HR employee record
    const adminEmployee = new Employee({
      employeeId: "HR001",
      userId: adminUser._id,
      role: "HR",
      department: "Human Resources",
      designation: "HR Manager",
      salary: 50000,
      joinDate: new Date("2022-01-01"),
    })
    await adminEmployee.save()

    // Create sample schedules
    const schedules = [
      {
        title: "Team Meeting",
        description: "Weekly team sync meeting",
        date: new Date(),
        time: "10:00",
        type: "meeting",
        createdBy: adminUser._id,
      },
      {
        title: "Interview - Frontend Developer",
        description: "Technical interview for frontend position",
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        time: "14:00",
        type: "interview",
        createdBy: adminUser._id,
      },
      {
        title: "Performance Review",
        description: "Quarterly performance reviews",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        time: "11:00",
        type: "meeting",
        createdBy: adminUser._id,
      },
    ]
    await Schedule.insertMany(schedules)

    // Create sample job posts
    const jobPosts = [
      {
        title: "UI/UX Designer",
        type: "Full Time",
        location: "Onsite - Indore, Madhya Pradesh",
        description:
          "A UI/UX Designer is responsible for designing the overall look, feel, and usability of digital products to ensure a seamless and engaging user experience.",
        aboutCompany:
          "TechnoRizen is a leading technology company focused on innovation and digital transformation. We create cutting-edge solutions that help businesses thrive in the digital age.",
        responsibilities: [
          "Design user interfaces for web and mobile applications",
          "Conduct user research and usability testing",
          "Create wireframes, prototypes, and design systems",
          "Collaborate with development teams to implement designs",
          "Stay updated with latest design trends and technologies",
        ],
        requirements: [
          "Bachelor's degree in Design, HCI, or related field",
          "3+ years of experience in UI/UX design",
          "Proficiency in design tools like Figma, Sketch, Adobe XD",
          "Strong understanding of user-centered design principles",
          "Experience with responsive and mobile-first design",
        ],
        department: "Design",
        postedBy: adminUser._id,
        activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        title: "Frontend Developer",
        type: "Full Time",
        location: "Remote",
        description:
          "A Frontend Developer is responsible for implementing visual elements that users see and interact with in web applications.",
        aboutCompany: "TechnoRizen is a leading technology company focused on innovation and digital transformation.",
        responsibilities: [
          "Develop responsive web applications using modern frameworks",
          "Implement pixel-perfect designs from UI/UX team",
          "Optimize applications for maximum speed and scalability",
          "Collaborate with backend developers and designers",
          "Write clean, maintainable, and well-documented code",
        ],
        requirements: [
          "Bachelor's degree in Computer Science or related field",
          "2+ years of experience in frontend development",
          "Proficiency in React, JavaScript, HTML, CSS",
          "Experience with version control systems (Git)",
          "Understanding of responsive design and cross-browser compatibility",
        ],
        department: "Development",
        postedBy: adminUser._id,
        activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Backend Developer",
        type: "Full Time",
        location: "Hybrid",
        description:
          "A Backend Developer is responsible for server-side web application logic and integration of the work front-end developers do.",
        aboutCompany: "TechnoRizen is a leading technology company focused on innovation and digital transformation.",
        responsibilities: [
          "Design and implement server-side logic",
          "Develop and maintain APIs and databases",
          "Ensure high performance and responsiveness of applications",
          "Implement security and data protection measures",
          "Collaborate with frontend developers and other team members",
        ],
        requirements: [
          "Bachelor's degree in Computer Science or related field",
          "3+ years of experience in backend development",
          "Proficiency in Node.js, Python, or Java",
          "Experience with databases (MongoDB, PostgreSQL)",
          "Knowledge of cloud platforms (AWS, Azure, GCP)",
        ],
        department: "Development",
        postedBy: adminUser._id,
        activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ]
    await JobPost.insertMany(jobPosts)

    console.log("✅ Admin data seeded successfully!")
    console.log("🔑 Admin login credentials:")
    console.log("   Email: admin@technorizen.com")
    console.log("   Password: admin123")
  } catch (error) {
    console.error("❌ Error seeding admin data:", error)
  }
}

module.exports = { seedAdminData }
