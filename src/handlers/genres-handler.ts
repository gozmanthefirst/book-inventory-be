// External Imports
import type { Handler } from "hono";

export const getAllGenres: Handler = (c) => {
  return c.text(`GET - ${c.req.path}`);
};
