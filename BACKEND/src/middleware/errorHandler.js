const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(`[Unhandled Error] ${err.name}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, 400, `Resource not found with id of ${err.value}`);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    return errorResponse(res, 400, `${field} already exists with value '${err.keyValue[field]}'`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return errorResponse(res, 400, 'Validation failed', messages);
  }

  // Default server error
  return errorResponse(
    res,
    err.statusCode || 500,
    err.message || 'Internal Server Error'
  );
};

module.exports = errorHandler;
