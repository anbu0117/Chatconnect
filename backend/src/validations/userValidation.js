import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(160).optional(),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6).max(128),
  }).strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getUsersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().max(50).optional(),
  }).strict(),
  params: z.object({}).optional(),
});
