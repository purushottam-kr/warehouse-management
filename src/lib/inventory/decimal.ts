import Decimal from "decimal.js";

export const addDecimal = (
  left: string,
  right: string,
) => {
  return new Decimal(left)
    .plus(right)
    .toFixed(3);
};

export const subtractDecimal = (
  left: string,
  right: string,
) => {
  return new Decimal(left)
    .minus(right)
    .toFixed(3);
};

export const compareDecimal = (
  left: string,
  right: string,
) => {
  return new Decimal(left).comparedTo(right);
};

export const isDecimalGreaterThan = (
  left: string,
  right: string,
) => {
  return compareDecimal(left, right) > 0;
};

export const isDecimalGreaterThanOrEqual = (
  left: string,
  right: string,
) => {
  return compareDecimal(left, right) >= 0;
};