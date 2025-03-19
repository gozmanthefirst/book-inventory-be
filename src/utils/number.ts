export const roundUp = (number: number): number => Math.ceil(number);

export const roundToTwoDecimals = (number: number): number =>
  Math.round(number * 100) / 100;
