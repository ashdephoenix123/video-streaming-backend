const HTTP_ERRORS = require("../constants");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_ERRORS.INTERNAL_SERVER_ERROR;

  let title = "";

  switch (statusCode) {
    case HTTP_ERRORS.BAD_REQUEST:
      title = "Validation error";
      break;

    case HTTP_ERRORS.UNAUTHORIZED:
      title = "Unauthorized";
      break;

    case HTTP_ERRORS.FORBIDDEN:
      title = "Forbidden";
      break;

    case HTTP_ERRORS.NOT_FOUND:
      title = "Not Found";
      break;

    case HTTP_ERRORS.INTERNAL_SERVER_ERROR:
      title = "Internal Sever Error";
      break;

    default:
      title = "Internal Sever Error";
  }

  let response = {
    title,
    message: err.message,
    ...(process.env.NODE_ENV !== "production" ? { error: err.stack } : {}),
  };

  return res.status(statusCode).json(response);
};

module.exports = { errorHandler };
