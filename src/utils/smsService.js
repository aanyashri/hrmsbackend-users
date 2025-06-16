const twilio = require("twilio")

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

/**
 * Send SMS using Twilio
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} body - SMS message body
 * @returns {Promise} - Twilio response
 */
const sendSMS = async (to, body) => {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    })

    console.log("SMS sent successfully:", message.sid)
    return { success: true, messageId: message.sid }
  } catch (error) {
    console.error("Twilio SMS error:", error)
    return { success: false, error }
  }
}

/**
 * Send bulk SMS using Twilio
 * @param {Array} recipients - Array of recipient objects with phone and message
 * @returns {Promise} - Array of Twilio responses
 */
const sendBulkSMS = async (recipients) => {
  try {
    const promises = recipients.map((recipient) =>
      client.messages.create({
        body: recipient.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipient.phone,
      }),
    )

    const results = await Promise.allSettled(promises)

    const successful = results.filter((r) => r.status === "fulfilled").length
    console.log(`Bulk SMS: ${successful}/${recipients.length} messages sent successfully`)

    return {
      success: true,
      total: recipients.length,
      successful,
      failed: recipients.length - successful,
      results,
    }
  } catch (error) {
    console.error("Twilio bulk SMS error:", error)
    return { success: false, error }
  }
}

/**
 * Verify phone number using Twilio Verify
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise} - Verification service response
 */
const sendVerificationCode = async (phoneNumber) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" })

    return { success: true, verification }
  } catch (error) {
    console.error("Twilio verification error:", error)
    return { success: false, error }
  }
}

/**
 * Check verification code
 * @param {string} phoneNumber - Phone number
 * @param {string} code - Verification code
 * @returns {Promise} - Verification check response
 */
const checkVerificationCode = async (phoneNumber, code) => {
  try {
    const verification_check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phoneNumber, code })

    return {
      success: true,
      valid: verification_check.status === "approved",
      verification_check,
    }
  } catch (error) {
    console.error("Twilio verification check error:", error)
    return { success: false, error }
  }
}

module.exports = {
  sendSMS,
  sendBulkSMS,
  sendVerificationCode,
  checkVerificationCode,
}
