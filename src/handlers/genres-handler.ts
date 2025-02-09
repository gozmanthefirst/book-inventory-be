// External Imports
import type { Handler } from "hono";
import { StatusCodes } from "http-status-codes";

// Local Imports
import { getAllGenresQ } from "@/lib/db/genres.js";
import { errorResponse, successResponse } from "@/lib/utils/api-response.js";

export const getAllGenres: Handler = async (c) => {
  try {
    const genres = await getAllGenresQ();
    return c.json(
      successResponse("Genres successfully retrieved.", genres),
      StatusCodes.OK,
    );
  } catch (error) {
    console.error("Error retrieving genres:", error);
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", "Error retrieving genres."),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
