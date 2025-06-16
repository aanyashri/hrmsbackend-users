const sgMail = require("@sendgrid/mail")

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

/**
 * Send an email using SendGrid
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise} - SendGrid response
 */
const sendEmail = async (to, subject, text, html = null) => {
  try {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME,
      },
      subject,
      text,
      html: html || text,
    }

    const response = await sgMail.send(msg)
    console.log("Email sent successfully:", response[0].statusCode)
    return { success: true, response }
  } catch (error) {
    console.error("SendGrid email error:", error)
    if (error.response) {
      console.error("Error details:", error.response.body)
    }
    return { success: false, error }
  }
}

/**
 * Send a template email using SendGrid
 * @param {string} to - Recipient email address
 * @param {string} templateId - SendGrid template ID
 * @param {Object} dynamicData - Dynamic template data
 * @returns {Promise} - SendGrid response
 */
const sendTemplateEmail = async (to, templateId, dynamicData) => {
  try {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME,
      },
      templateId,
      dynamicTemplateData: dynamicData,
    }

    const response = await sgMail.send(msg)
    console.log("Template email sent successfully:", response[0].statusCode)
    return { success: true, response }
  } catch (error) {
    console.error("SendGrid template email error:", error)
    if (error.response) {
      console.error("Error details:", error.response.body)
    }
    return { success: false, error }
  }
}

/**
 * Send bulk emails using SendGrid
 * @param {Array} recipients - Array of recipient objects with email and dynamic data
 * @param {string} templateId - SendGrid template ID
 * @returns {Promise} - SendGrid response
 */
const sendBulkEmails = async (recipients, templateId) => {
  try {
    const messages = recipients.map((recipient) => ({
      to: recipient.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME,
      },
      templateId,
      dynamicTemplateData: recipient.data,
    }))

    const response = await sgMail.send(messages)
    console.log("Bulk emails sent successfully:", response[0].statusCode)
    return { success: true, response }
  } catch (error) {
    console.error("SendGrid bulk email error:", error)
    if (error.response) {
      console.error("Error details:", error.response.body)
    }
    return { success: false, error }
  }
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendBulkEmails,
}
