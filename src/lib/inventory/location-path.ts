/*
 * Shared full-path location display.
 *
 * "Where is this item stored" renders as
 * Warehouse / Aisle / Bay / Layer / Space.
 * Segments are nullable because legacy-shaped rows
 * (not yet backfilled) have no chain below the
 * warehouse — missing levels are simply skipped.
 */

export type LocationPathSegments = {
  warehouseName?: string | null;
  aisleName?: string | null;
  bayName?: string | null;
  layerName?: string | null;
  spaceName?: string | null;
};

export const formatLocationPath = (
  segments: LocationPathSegments,
): string => {
  return [
    segments.warehouseName,
    segments.aisleName,
    segments.bayName,
    segments.layerName,
    segments.spaceName,
  ]
    .map((segment) => segment?.trim() || "")
    .filter((segment) => segment.length > 0)
    .join(" / ");
};
