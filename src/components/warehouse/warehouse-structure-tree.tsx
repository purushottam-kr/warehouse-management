"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

type Aisle = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type Bay = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type Layer = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type Space = {
  id: string;
  layerId: string | null;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
  status: "ACTIVE" | "INACTIVE";
};

type ListResponse<T> = {
  data: T[];
};

const formatCapacity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

const readError = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = (await response.json()) as {
      error?: { message?: string };
    };

    return data.error?.message ?? fallback;
  } catch {
    return fallback;
  }
};

/*
 * Read-only physical-hierarchy tree for one warehouse:
 * Aisle → Bay → Layer → Storage space.
 *
 * Aisles and spaces load up front; bays and layers
 * load lazily on expand. Used inside the warehouse
 * quick-view modal; the full drill-down (with add
 * forms) lives on the warehouse detail page.
 */
export const WarehouseStructureTree = ({
  warehouseId,
}: {
  warehouseId: string;
}) => {
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [baysByAisle, setBaysByAisle] = useState<
    Record<string, Bay[]>
  >({});
  const [layersByBay, setLayersByBay] = useState<
    Record<string, Layer[]>
  >({});
  const [spaces, setSpaces] = useState<Space[]>([]);

  const [expandedAisles, setExpandedAisles] = useState<string[]>([]);
  const [expandedBays, setExpandedBays] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setError("");

        const [aislesResponse, spacesResponse] =
          await Promise.all([
            fetch(
              `/api/warehouses/${warehouseId}/aisles`,
              { cache: "no-store" },
            ),
            fetch(
              `/api/warehouses/${warehouseId}/storage-spaces`,
              { cache: "no-store" },
            ),
          ]);

        if (!aislesResponse.ok) {
          throw new Error(
            await readError(
              aislesResponse,
              "Unable to load aisles.",
            ),
          );
        }

        if (!spacesResponse.ok) {
          throw new Error(
            await readError(
              spacesResponse,
              "Unable to load storage spaces.",
            ),
          );
        }

        const aislesData =
          (await aislesResponse.json()) as ListResponse<Aisle>;
        const spacesData =
          (await spacesResponse.json()) as ListResponse<Space>;

        setAisles(aislesData.data);
        setSpaces(spacesData.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load warehouse structure.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [warehouseId]);

  const toggleAisle = async (aisleId: string) => {
    if (expandedAisles.includes(aisleId)) {
      setExpandedAisles(
        expandedAisles.filter((id) => id !== aisleId),
      );
      return;
    }

    setExpandedAisles([...expandedAisles, aisleId]);

    if (baysByAisle[aisleId] !== undefined) {
      return;
    }

    try {
      setLoadingId(aisleId);

      const response = await fetch(
        `/api/aisles/${aisleId}/bays`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "Unable to load bays."),
        );
      }

      const data =
        (await response.json()) as ListResponse<Bay>;

      setBaysByAisle((previous) => ({
        ...previous,
        [aisleId]: data.data,
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load bays.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const toggleBay = async (bayId: string) => {
    if (expandedBays.includes(bayId)) {
      setExpandedBays(
        expandedBays.filter((id) => id !== bayId),
      );
      return;
    }

    setExpandedBays([...expandedBays, bayId]);

    if (layersByBay[bayId] !== undefined) {
      return;
    }

    try {
      setLoadingId(bayId);

      const response = await fetch(
        `/api/bays/${bayId}/layers`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            "Unable to load layers.",
          ),
        );
      }

      const data =
        (await response.json()) as ListResponse<Layer>;

      setLayersByBay((previous) => ({
        ...previous,
        [bayId]: data.data,
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load layers.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </div>
    );
  }

  if (error && aisles.length === 0) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300"
      >
        {error}
      </div>
    );
  }

  if (aisles.length === 0) {
    return (
      <div className="px-2 py-8 text-center">
        <p className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
          No aisles yet
        </p>

        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          This warehouse has no location hierarchy
          configured.
        </p>

        <Link
          href={`/warehouses/${warehouseId}`}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-100 px-3.5 text-sm font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white"
        >
          Open warehouse
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const spacesForLayer = (layerId: string) =>
    spaces.filter((space) => space.layerId === layerId);

  const capacityFor = (list: Space[]) =>
    list.reduce(
      (total, space) => total + Number(space.capacity),
      0,
    );

  return (
    <div className="space-y-1.5">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      {aisles.map((aisle) => {
        const expanded = expandedAisles.includes(aisle.id);
        const bays = baysByAisle[aisle.id];

        return (
          <div
            key={aisle.id}
            className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <button
              type="button"
              onClick={() => void toggleAisle(aisle.id)}
              className="flex w-full items-center gap-2.5 bg-white dark:bg-neutral-900 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
              )}

              <span className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
                {aisle.name}
              </span>

              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {aisle.code}
              </span>

              <span
                className={
                  aisle.status === "ACTIVE"
                    ? "inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
                    : "inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400"
                }
              >
                {aisle.status === "ACTIVE"
                  ? "Active"
                  : "Inactive"}
              </span>

              {bays !== undefined ? (
                <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">
                  {bays.length}{" "}
                  {bays.length === 1 ? "bay" : "bays"}
                </span>
              ) : null}
            </button>

            {expanded ? (
              <div className="space-y-1.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-3 py-2.5">
                {loadingId === aisle.id ? (
                  <p className="px-1 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Loading bays…
                  </p>
                ) : !bays || bays.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                    No bays in this aisle.
                  </p>
                ) : (
                  bays.map((bay) => {
                    const bayExpanded =
                      expandedBays.includes(bay.id);
                    const layers =
                      layersByBay[bay.id];

                    return (
                      <div
                        key={bay.id}
                        className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void toggleBay(bay.id)
                          }
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          {bayExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          )}

                          <span className="text-[13px] font-medium text-neutral-950 dark:text-neutral-100">
                            {bay.name}
                          </span>

                          <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                            {bay.code}
                          </span>

                          {layers !== undefined ? (
                            <span className="ml-auto text-[11px] text-neutral-400 dark:text-neutral-500">
                              {layers.length}{" "}
                              {layers.length === 1
                                ? "layer"
                                : "layers"}
                            </span>
                          ) : null}
                        </button>

                        {bayExpanded ? (
                          <div className="space-y-1.5 border-t border-neutral-100 dark:border-neutral-800 px-3 py-2">
                            {loadingId === bay.id ? (
                              <p className="px-1 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                                Loading layers…
                              </p>
                            ) : !layers ||
                              layers.length === 0 ? (
                              <p className="px-1 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                                No layers in this bay.
                              </p>
                            ) : (
                              layers.map((layer) => {
                                const layerSpaces =
                                  spacesForLayer(
                                    layer.id,
                                  );

                                return (
                                  <div
                                    key={layer.id}
                                    className="rounded-md bg-neutral-50 dark:bg-neutral-800/60 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[13px] font-medium text-neutral-950 dark:text-neutral-100">
                                        {layer.name}
                                      </span>

                                      <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                        {layer.code}
                                      </span>

                                      <span className="ml-auto text-[11px] text-neutral-400 dark:text-neutral-500">
                                        {
                                          layerSpaces.length
                                        }{" "}
                                        {layerSpaces.length ===
                                        1
                                          ? "space"
                                          : "spaces"}{" "}
                                        ·{" "}
                                        {formatCapacity(
                                          String(
                                            capacityFor(
                                              layerSpaces,
                                            ),
                                          ),
                                        )}
                                      </span>
                                    </div>

                                    {layerSpaces.length >
                                    0 ? (
                                      <ul className="mt-1.5 space-y-1 border-t border-neutral-200/70 dark:border-neutral-700/60 pt-1.5">
                                        {layerSpaces.map(
                                          (space) => (
                                            <li
                                              key={space.id}
                                              className="flex items-center gap-2 text-xs"
                                            >
                                              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                {space.name}
                                              </span>

                                              <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                                {space.code}
                                              </span>

                                              <span className="ml-auto font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                                {formatCapacity(
                                                  space.capacity,
                                                )}
                                              </span>
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    ) : null}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      <Link
        href={`/warehouses/${warehouseId}`}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        Open full warehouse page
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
};
