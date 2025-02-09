/**
 * Generates a success response object.
 *
 * @param {string} details - A message providing more details about the success.
 * @param {any} [data] - Optional additional data related to the success response.
 * @returns {Object} An object containing the status, details, and optionally data.
 *
 * @example
 * successResponse("Operation completed", { id: 1 });
 * // {
 * //   status: "success",
 * //   details: "Operation completed",
 * //   data: { id: 1 }
 * // }
 *
 * successResponse("Operation completed");
 * // {
 * //   status: "success",
 * //   details: "Operation completed"
 * // }
 */
export const successResponse = (details: string, data?: any) => {
  if (data) {
    return {
      status: "success",
      details,
      data,
    };
  } else {
    return {
      status: "success",
      details,
    };
  }
};

/**
 * Generates an error response object.
 *
 * @param {string} code - A string representing the error code.
 * @param {string | string[]} details - A message or list of messages providing more details about the error.
 * @param {any} [data] - Optional additional data related to the error response.
 * @returns {Object} An object containing the status, code, details, and optionally data.
 *
 * @example
 * errorResponse("400", "Invalid input");
 * // {
 * //   status: "error",
 * //   code: "400",
 * //   details: "Invalid input"
 * // }
 *
 * errorResponse("400", ["Invalid input", "Missing fields"], { field: "email" });
 * // {
 * //   status: "error",
 * //   code: "400",
 * //   details: ["Invalid input", "Missing fields"],
 * //   data: { field: "email" }
 * // }
 */
export const errorResponse = (
  code: string,
  details: string | string[],
  data?: any
) => {
  if (data) {
    return {
      status: "error",
      code,
      details,
      data,
    };
  } else {
    return {
      status: "error",
      code,
      details,
    };
  }
};
