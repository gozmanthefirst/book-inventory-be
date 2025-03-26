import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { getConnInfo } from "@hono/node-server/conninfo";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import db from "../config/prisma.js";
import { comparePasswords, hashPassword } from "../lib/auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import {
  authRateLimiter,
  emailRateLimiter,
  passwordResetLimiter,
} from "../lib/rate-limit";
import {
  createPasswordResetToken,
  validatePasswordResetToken,
} from "../lib/reset-password.js";
import { createSession } from "../lib/session.js";
import {
  createVerificationToken,
  validateVerificationToken,
} from "../lib/verification.js";
import { zv } from "../middleware/validator.js";
import { errorResponse, successResponse } from "../utils/api-response.js";
import {
  loginSchema,
  requestPasswordResetSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signUpSchema,
} from "../validators/auth-validator.js";

const auth = new Hono({ strict: false });

//* Register a new user
//* POST /auth/register
auth.post("/register", authRateLimiter, zv("json", signUpSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid("json");

    // Check if user already exists
    const userExists = await db.user.findUnique({ where: { email } });
    if (userExists) {
      return c.json(
        errorResponse("USER_EXISTS", "User with this email already exists."),
        StatusCodes.CONFLICT,
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
      },
    });

    // Create and send verification token
    const verificationToken = await createVerificationToken(user);
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken.token,
    });

    return c.json(
      successResponse(
        "User created successfully. Please check your email to verify your account.",
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
      ),
      StatusCodes.CREATED,
    );
  } catch (error) {
    console.error("Error registering user:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error registering user."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

//* Verify email
//* GET /auth/verify-email
auth.get("/verify-email", async (c) => {
  try {
    const token = c.req.query("token");

    if (!token) {
      return c.json(
        errorResponse("INVALID_TOKEN", "Verification token is required."),
        StatusCodes.BAD_REQUEST,
      );
    }

    const verificationToken = await validateVerificationToken(token);

    if (!verificationToken) {
      return c.json(
        errorResponse(
          "INVALID_TOKEN",
          "Invalid or expired verification token.",
        ),
        StatusCodes.BAD_REQUEST,
      );
    }

    // Update user and cleanup
    await db.$transaction([
      db.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      db.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    return c.json(
      successResponse("Email verified successfully."),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error during email verification:", error);
    return c.json(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        "Error during email verification.",
      ),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

//* Resend verification email
//* POST /auth/resend-verification
auth.post(
  "/resend-verification",
  emailRateLimiter,
  zv("json", resendVerificationSchema),
  async (c) => {
    try {
      const { email } = c.req.valid("json");

      const user = await db.user.findUnique({ where: { email } });

      if (!user) {
        // Return same message as success to prevent email enumeration
        return c.json(
          successResponse(
            "If your email exists, a verification link has been sent.",
          ),
          StatusCodes.OK,
        );
      }

      if (user.emailVerified) {
        return c.json(
          errorResponse("ALREADY_VERIFIED", "This email is already verified."),
          StatusCodes.BAD_REQUEST,
        );
      }

      // Delete any existing verification tokens
      await db.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new verification token
      const verificationToken = await createVerificationToken(user);

      // Send verification email
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: verificationToken.token,
      });

      return c.json(
        successResponse(
          "If your email exists, a verification link has been sent.",
        ),
        StatusCodes.OK,
      );
    } catch (error) {
      console.error("Error resending verification email:", error);
      return c.json(
        errorResponse(
          "INTERNAL_SERVER_ERROR",
          "Error resending verification email.",
        ),
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

//* Login a user
//* POST /auth/login
auth.post("/login", authRateLimiter, zv("json", loginSchema), async (c) => {
  try {
    // Delete any existing session
    const existingToken = await getSignedCookie(
      c,
      env.COOKIE_SECRET,
      env.AUTH_COOKIE,
    );

    if (existingToken) {
      await db.session.delete({ where: { token: existingToken } });
      deleteCookie(c, env.AUTH_COOKIE);
    }

    const { email, password } = c.req.valid("json");

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await comparePasswords(password, user.passwordHash))) {
      return c.json(
        errorResponse("INVALID_CREDENTIALS", "Invalid email or password."),
        StatusCodes.CONFLICT,
      );
    }

    if (!user.emailVerified) {
      // Create new verification token
      const verificationToken = await createVerificationToken(user);

      // Send verification email
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: verificationToken.token,
      });

      return c.json(
        errorResponse(
          "EMAIL_NOT_VERIFIED",
          "Your email is not verified. A new verification email has been sent.",
        ),
        StatusCodes.FORBIDDEN,
      );
    }

    // Get session expiry date
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    // Get connection info
    const connInfo = getConnInfo(c);

    // Create session
    const session = await createSession(user, expires, {
      ipAddress: connInfo.remote.address,
      userAgent: c.req.header("user-agent"),
    });

    // Set session token in HTTP-only cookie
    await setSignedCookie(
      c,
      env.AUTH_COOKIE,
      session.token,
      env.COOKIE_SECRET,
      {
        path: "/",
        secure: env.NODE_ENV === "production",
        domain: env.NODE_ENV === "production" ? "your-domain.com" : undefined,
        httpOnly: true,
        expires,
        sameSite: "Strict",
      },
    );

    return c.json(
      successResponse("Login successful.", {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      }),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error during login:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error during login."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

//* Request password reset
//* POST /auth/request-reset
auth.post(
  "/request-reset",
  passwordResetLimiter,
  zv("json", requestPasswordResetSchema),
  async (c) => {
    try {
      const { email } = c.req.valid("json");

      const user = await db.user.findUnique({ where: { email } });

      if (!user) {
        // Return same message as success to prevent email enumeration
        return c.json(
          successResponse(
            "If your email exists, a password reset link has been sent.",
          ),
          StatusCodes.OK,
        );
      }

      // Create reset token
      const resetToken = await createPasswordResetToken(user);

      // Send reset email
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: resetToken.token,
      });

      return c.json(
        successResponse(
          "If your email exists, a password reset link has been sent.",
        ),
        StatusCodes.OK,
      );
    } catch (error) {
      console.error("Error requesting password reset email:", error);
      return c.json(
        errorResponse(
          "INTERNAL_SERVER_ERROR",
          "Error requesting password reset email.",
        ),
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

//* Reset password
//* POST /auth/reset-password
auth.post(
  "/reset-password",
  passwordResetLimiter,
  zv("json", resetPasswordSchema),
  async (c) => {
    try {
      const { token, password } = c.req.valid("json");

      const resetToken = await validatePasswordResetToken(token);

      if (!resetToken) {
        return c.json(
          errorResponse("INVALID_TOKEN", "Invalid or expired reset token."),
          StatusCodes.BAD_REQUEST,
        );
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password and cleanup in a transaction
      await db.$transaction([
        db.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash: hashedPassword },
        }),
        db.passwordResetToken.delete({
          where: { id: resetToken.id },
        }),
        // Delete all sessions for this user
        db.session.deleteMany({
          where: { userId: resetToken.userId },
        }),
      ]);

      // Delete cookie
      deleteCookie(c, env.AUTH_COOKIE);

      return c.json(
        successResponse(
          "Password reset successful. Please login with your new password.",
        ),
        StatusCodes.OK,
      );
    } catch (error) {
      console.error("Error resetting password:", error);
      return c.json(
        errorResponse("INTERNAL_SERVER_ERROR", "Error resetting password."),
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
);

//* Logout user
//* POST /auth/logout
auth.post("/logout", async (c) => {
  try {
    const sessionToken = await getSignedCookie(
      c,
      env.COOKIE_SECRET,
      env.AUTH_COOKIE,
    );

    if (sessionToken) {
      // Delete session from database
      await db.session.delete({ where: { token: sessionToken } });

      // Clear session cookie
      deleteCookie(c, env.AUTH_COOKIE);
    }

    return c.json(successResponse("Logged out successfully."), StatusCodes.OK);
  } catch (error) {
    console.error("Error during logout:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error during logout."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

export default auth;
