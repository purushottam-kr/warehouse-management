export const STORAGE_TYPES = [
  "AMBIENT",
  "COLD",
  "FROZEN",
  "HAZARDOUS",
  "SECURE",
  "BULK",
] as const;

export const normalizeStorageType = (
  storageType: string,
) => {
  return storageType.trim().toUpperCase();
};