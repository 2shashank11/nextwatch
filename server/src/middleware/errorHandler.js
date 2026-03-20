export function errorHandler(err, _req, res, _next) {
  const status = typeof err?.status === "number" ? err.status : 500;

  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    error: {
      message: err?.message || "Internal Server Error",
    },
  });
}

