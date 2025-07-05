const errors = require("../constants");

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode || 500;

  switch (statusCode) {
    case errors.VALIDATION_ERR:
      res.json({
        title: "Validation error",
        message: err.message,
        error: err.stack,
      });
      break;

    case errors.UNAUTHORIZED:
      res.json({
        title: "Unauthorized",
        message: err.message,
        error: err.stack,
      });
      break;

    case errors.FORBIDDEN:
      res.json({
        title: "Forbidden",
        message: err.message,
        error: err.stack,
      });
      break;

    case errors.NOT_FOUND:
      res.json({
        title: "Not Found",
        message: err.message,
        error: err.stack,
      });
      break;

    case errors.SERVER_ERR:
      res.json({
        title: "Sever Error",
        message: err.message,
        error: err.stack,
      });
      break;

    default:
      console.log("All good!");
  }
};

module.exports = { errorHandler };
