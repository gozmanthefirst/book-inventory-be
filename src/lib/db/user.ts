// Local Imports
import db from "./prisma.js";

export const getUserByIdQ = async (id: string) => {
  const user = await db.user.findUnique({
    where: {
      id,
    },
    include: {
      books: true,
    },
  });
  return user;
};
