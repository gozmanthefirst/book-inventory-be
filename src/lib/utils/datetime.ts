export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

export const isValidPastDate = (date: unknown): boolean => {
  if (typeof date === "string" || date instanceof Date) {
    const parsedDate = new Date(date);
    const now = new Date();

    return !isNaN(parsedDate.getTime()) && parsedDate < now;
  }
  return false;
};