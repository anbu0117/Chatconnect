import express from "express";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validations/authValidation.js";
import { register, login, logout, checkAuth } from "../controllers/authController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);

export default router;
