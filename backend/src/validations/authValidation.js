import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: "Username is required" })
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(
        /^[a-zA-Z0-9_ .-]+$/,
        "Username can only contain letters, numbers, spaces, underscores, hyphens, and dots"
      ),
    email: z
      .string({ required_error: "Email is required" })
      .email("Please enter a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password cannot exceed 128 characters"),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Please enter a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .max(128),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Please enter a valid email address"),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Please enter a valid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

