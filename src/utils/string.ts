export const removeDashesAndSpaces = (input: string): string => {
  return input.replace(/[-\s]/g, "");
};
