// External Imports
import type { Handler } from "hono";

export const getAllAuthors: Handler = (c) => {
  return c.text(`GET - ${c.req.path}`);
};
