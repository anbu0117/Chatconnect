/**
 * Centralized error handler. Any error passed to next(err), or thrown
 * inside an async route wrapped with a try/catch that calls next(err),
 * ends up here so responses stay consistent across the API.
 */
export const errorHandler = (err, req, res, next) => {
  console.error("[errorHandler]", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  // Mongoose duplicate key (e.g. username/email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : "Field"} already in use`;
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  console.error(`[Error] ${err.name}: ${err.message}\n`, err.stack);

  res.status(statusCode).json({
    message,
  });
};

export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};
