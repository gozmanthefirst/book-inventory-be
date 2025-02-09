// External Imports
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";

// Local Imports
import { errorResponse } from "@/lib/utils/api-response.js";
import { auth } from "@/services/auth.js";

export const authenticate = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session?.user;

  if (!user) {
    return c.json(
      errorResponse("UNAUTHENTICATED", "You are not authenticated."),
      StatusCodes.UNAUTHORIZED,
    );
  }

  await next();
});
