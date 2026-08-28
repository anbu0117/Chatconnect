import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"),
    email: z.string().email(),
    password: z.string().min(6).max(128),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1).max(128), // Allow shorter passwords for login attempt
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

