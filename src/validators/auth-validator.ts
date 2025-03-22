import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: z
    .string()
    .min(8, "New password must be at least 8 characters long."),
});
