// utils/ApiError.js
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    // This captures the stack trace correctly in Node.js
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
