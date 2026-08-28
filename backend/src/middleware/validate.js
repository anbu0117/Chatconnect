export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next();
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        message: err.issues?.[0]?.message || "Validation failed",

        errors: (err.issues || []).map((e) => ({
          path: (e.path ?? []).join("."),
          message: e.message,
        })),
      });
    }

    console.error("[Validation Error]", err);

    return res.status(500).json({
      message: "Internal Server Error during validation",
    });
  }
};