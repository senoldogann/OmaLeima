const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && uuidPattern.test(value);

export const isOptionalUuid = (value: unknown): value is string | undefined =>
  typeof value === "undefined" || isUuid(value);

export const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isOptionalLatitude = (value: unknown): value is number | null => {
  if (value === null || typeof value === "undefined") {
    return true;
  }

  return isFiniteNumber(value) && value >= -90 && value <= 90;
};

export const isOptionalLongitude = (value: unknown): value is number | null => {
  if (value === null || typeof value === "undefined") {
    return true;
  }

  return isFiniteNumber(value) && value >= -180 && value <= 180;
};
