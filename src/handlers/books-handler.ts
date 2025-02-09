// External Imports
import type { Handler } from "hono";

export const getAllBooks: Handler = (c) => {
  return c.text(`GET - ${c.req.path}`);
};

export const createNewBook: Handler = (c) => {
  return c.text(`POST - ${c.req.path}`);
};

export const getSingleBook: Handler = (c) => {
  return c.text(`GET - ${c.req.path}`);
};

export const deleteSingleBook: Handler = (c) => {
  return c.text(`DELETE - ${c.req.path}`);
};
