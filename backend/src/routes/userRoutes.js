import express from "express";
import { getUsers, updateProfile, changePassword } from "../controllers/userController.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema, changePasswordSchema, getUsersSchema } from "../validations/userValidation.js";
import { userActionLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(protectRoute); // every route below requires auth
router.use(userActionLimiter); // moderate rate limit for logged in users

router.get("/", validate(getUsersSchema), getUsers);
router.put("/profile", upload.single("profileImage"), validate(updateProfileSchema), updateProfile);
router.put("/password", validate(changePasswordSchema), changePassword);

export default router;
