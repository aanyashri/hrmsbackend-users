const generateResponse = (success, message, data = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
  }

  if (data !== null) {
    response.data = data
  }

  return response
}

const generateErrorResponse = (message, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  }

  if (errors) {
    response.errors = errors
  }

  return response
}

module.exports = {
  generateResponse,
  generateErrorResponse,
}
