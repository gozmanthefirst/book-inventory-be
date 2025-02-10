// External Imports
import type { Handler } from "hono";
import { StatusCodes } from "http-status-codes";

// Local Imports
import { getAllAuthorsQ } from "../lib/db/authors.js";
import { errorResponse, successResponse } from "../lib/utils/api-response.js";

export const getAllAuthors: Handler = async (c) => {
  try {
    const authors = await getAllAuthorsQ();
    return c.json(
      successResponse("Authors successfully retrieved.", authors),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error retrieving authors:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error retrieving authors."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
