import { ZodError } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next();
  } catch (err) {
    if (err instanceof ZodError || err.name === "ZodError" || err.issues || err.errors) {
      const issues = err.issues || err.errors || [];
      const firstMessage = issues[0]?.message || "Validation failed";

      return res.status(400).json({
        message: firstMessage,
        errors: issues.map((e) => ({
          path: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
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