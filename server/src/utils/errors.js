/**
 * Custom error classes and centralized error handler for Express.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

/**
 * Centralized Express error handler.
 * Catches all errors thrown in route handlers and middleware.
 */
export const errorHandler = (err, _req, res, _next) => {
  // Log all errors
  console.error(`[ERROR] ${err.statusCode || 500} - ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // DynamoDB-specific errors
  if (err.name === 'ConditionalCheckFailedException') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'The resource was modified by another request. Please retry.',
    });
  }

  if (err.name === 'ResourceNotFoundException') {
    return res.status(500).json({
      error: 'Configuration error',
      message: 'A required DynamoDB table does not exist.',
    });
  }

  // Operational errors (expected — we created them)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Unknown errors (bugs)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
};
