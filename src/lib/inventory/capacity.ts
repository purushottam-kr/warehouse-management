import Decimal from "decimal.js";

export const calculateAvailableCapacity = (
  capacity: string,
  allocatedQuantity: string,
) => {
  return new Decimal(capacity)
    .minus(allocatedQuantity)
    .toFixed(3);
};

export const canFitQuantity = (
  availableCapacity: string,
  requestedQuantity: string,
) => {
  return new Decimal(availableCapacity)
    .greaterThanOrEqualTo(requestedQuantity);
};