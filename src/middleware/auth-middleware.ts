import { deleteCookie, getSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import { validateSession } from "../lib/session.js";
import { errorResponse } from "../utils/api-response.js";

export const authMiddleware = createMiddleware(async (c, next) => {
  const sessionToken = await getSignedCookie(
    c,
    env.COOKIE_SECRET,
    env.AUTH_COOKIE,
  );

  if (!sessionToken) {
    return c.json(
      errorResponse("UNAUTHENTICATED", "No session found"),
      StatusCodes.UNAUTHORIZED,
    );
  }

  try {
    const session = await validateSession(sessionToken);

    if (!session) {
      // Clear invalid session cookie
      deleteCookie(c, env.AUTH_COOKIE);

      return c.json(
        errorResponse("UNAUTHENTICATED", "Session expired"),
        StatusCodes.UNAUTHORIZED,
      );
    }

    c.set("user", session.user);
    await next();
  } catch (error) {
    return c.json(
      errorResponse("UNAUTHENTICATED", "Invalid session"),
      StatusCodes.UNAUTHORIZED,
    );
  }
});
