"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { Warehouse } from "@/types/warehouse";
import type { StorageSpace } from "@/types/storage-space";

type UserRole = "ADMIN" | "STAFF";

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type Aisle = {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type Bay = {
  id: string;
  aisleId: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type Layer = {
  id: string;
  bayId: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
};

type ListResponse<T> = {
  data: T[];
};

type ItemResponse<T> = {
  data: T;
};

type UserResponse = {
  user: CurrentUser;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type AddTarget =
  | { level: "aisle"; parentId: string }
  | { level: "bay"; parentId: string }
  | { level: "layer"; parentId: string };

const formatCapacity = (value: string) => {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

const sumCapacity = (spaces: StorageSpace[]) => {
  return spaces.reduce(
    (total, space) => total + Number(space.capacity),
    0,
  );
};

const readError = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;

    return (
      data.error?.message ?? fallback
    );
  } catch {
    return fallback;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={
        isActive
          ? "inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 "
          : "inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 "
      }
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const WarehouseDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(
    null,
  );

  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [baysByAisle, setBaysByAisle] = useState<
    Record<string, Bay[]>
  >({});
  const [layersByBay, setLayersByBay] = useState<
    Record<string, Layer[]>
  >({});
  const [storageSpaces, setStorageSpaces] = useState<
    StorageSpace[]
  >([]);

  const [expandedAisles, setExpandedAisles] = useState<string[]>([]);
  const [expandedBays, setExpandedBays] = useState<string[]>([]);
  const [loadingBays, setLoadingBays] = useState<string[]>([]);
  const [loadingLayers, setLoadingLayers] = useState<string[]>([]);

  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [user, setUser] = useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const warehouseId = params.id;

  useEffect(() => {
    const loadWarehouse = async () => {
      try {
        setError("");

        const [
          warehouseResponse,
          aislesResponse,
          storageResponse,
          userResponse,
        ] = await Promise.all([
          fetch(`/api/warehouses/${warehouseId}`, {
            cache: "no-store",
          }),
          fetch(`/api/warehouses/${warehouseId}/aisles`, {
            cache: "no-store",
          }),
          fetch(
            `/api/warehouses/${warehouseId}/storage-spaces`,
            {
              cache: "no-store",
            },
          ),
          fetch("/api/auth/me", {
            cache: "no-store",
          }),
        ]);

        if (!warehouseResponse.ok) {
          throw new Error(
            await readError(
              warehouseResponse,
              "Unable to load warehouse.",
            ),
          );
        }

        if (!aislesResponse.ok) {
          throw new Error(
            await readError(
              aislesResponse,
              "Unable to load aisles.",
            ),
          );
        }

        if (!storageResponse.ok) {
          throw new Error(
            await readError(
              storageResponse,
              "Unable to load storage spaces.",
            ),
          );
        }

        if (!userResponse.ok) {
          throw new Error(
            await readError(
              userResponse,
              "Unable to load current user.",
            ),
          );
        }

        const warehouseData =
          (await warehouseResponse.json()) as ItemResponse<Warehouse>;
        const aislesData =
          (await aislesResponse.json()) as ListResponse<Aisle>;
        const storageData =
          (await storageResponse.json()) as ListResponse<StorageSpace>;
        const userData =
          (await userResponse.json()) as UserResponse;

        if (!("user" in userData)) {
          throw new Error("Invalid warehouse response.");
        }

        setWarehouse(warehouseData.data);
        setAisles(aislesData.data);
        setStorageSpaces(storageData.data);
        setUser(userData.user);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load warehouse.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadWarehouse();
  }, [warehouseId]);

  const spacesByLayer = useMemo(() => {
    const grouped: Record<string, StorageSpace[]> = {};

    for (const space of storageSpaces) {
      if (!space.layerId) {
        continue;
      }

      if (!grouped[space.layerId]) {
        grouped[space.layerId] = [];
      }

      grouped[space.layerId]!.push(space);
    }

    return grouped;
  }, [storageSpaces]);

  const unassignedSpaces = useMemo(() => {
    return storageSpaces.filter((space) => !space.layerId);
  }, [storageSpaces]);

  const toggleAisle = async (aisle: Aisle) => {
    if (expandedAisles.includes(aisle.id)) {
      setExpandedAisles(
        expandedAisles.filter((id) => id !== aisle.id),
      );
      return;
    }

    setExpandedAisles([...expandedAisles, aisle.id]);

    if (baysByAisle[aisle.id] !== undefined) {
      return;
    }

    try {
      setLoadingBays([...loadingBays, aisle.id]);

      const response = await fetch(
        `/api/aisles/${aisle.id}/bays`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "Unable to load bays."),
        );
      }

      const data = (await response.json()) as ListResponse<Bay>;

      setBaysByAisle((previous) => ({
        ...previous,
        [aisle.id]: data.data,
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load bays.",
      );
    } finally {
      setLoadingBays(
        loadingBays.filter((id) => id !== aisle.id),
      );
    }
  };

  const toggleBay = async (bay: Bay) => {
    if (expandedBays.includes(bay.id)) {
      setExpandedBays(
        expandedBays.filter((id) => id !== bay.id),
      );
      return;
    }

    setExpandedBays([...expandedBays, bay.id]);

    if (layersByBay[bay.id] !== undefined) {
      return;
    }

    try {
      setLoadingLayers([...loadingLayers, bay.id]);

      const response = await fetch(
        `/api/bays/${bay.id}/layers`,
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
        [bay.id]: data.data,
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load layers.",
      );
    } finally {
      setLoadingLayers(
        loadingLayers.filter((id) => id !== bay.id),
      );
    }
  };

  const handleCreate = async () => {
    if (!addTarget) {
      return;
    }

    const name = newName.trim();
    const code = newCode.trim();

    if (!name || !code) {
      setError("Name and code are required.");
      return;
    }

    const endpoints = {
      aisle: `/api/warehouses/${warehouseId}/aisles`,
      bay: `/api/aisles/${addTarget.parentId}/bays`,
      layer: `/api/bays/${addTarget.parentId}/layers`,
    } as const;

    try {
      setIsCreating(true);
      setError("");

      const response = await fetch(endpoints[addTarget.level], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, code }),
      });

      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            `Unable to create ${addTarget.level}.`,
          ),
        );
      }

      const data = (await response.json()) as
        | ItemResponse<Aisle>
        | ItemResponse<Bay>
        | ItemResponse<Layer>;

      if (addTarget.level === "aisle") {
        setAisles((previous) => [
          ...previous,
          data.data as Aisle,
        ]);
      } else if (addTarget.level === "bay") {
        const bay = data.data as Bay;

        setBaysByAisle((previous) => ({
          ...previous,
          [addTarget.parentId]: [
            ...(previous[addTarget.parentId] ?? []),
            bay,
          ],
        }));

        if (!expandedAisles.includes(addTarget.parentId)) {
          setExpandedAisles([
            ...expandedAisles,
            addTarget.parentId,
          ]);
        }
      } else {
        const layer = data.data as Layer;
        const parentBayId = addTarget.parentId;

        setLayersByBay((previous) => ({
          ...previous,
          [parentBayId]: [
            ...(previous[parentBayId] ?? []),
            layer,
          ],
        }));

        if (!expandedBays.includes(parentBayId)) {
          setExpandedBays([...expandedBays, parentBayId]);
        }
      }

      setAddTarget(null);
      setNewName("");
      setNewCode("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create location.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const renderAddForm = (target: AddTarget) => {
    const isOpen =
      addTarget !== null &&
      addTarget.level === target.level &&
      addTarget.parentId === target.parentId;

    if (!isOpen) {
      return (
        <button
          type="button"
          onClick={() => {
            setAddTarget(target);
            setNewName("");
            setNewCode("");
            setError("");
          }}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 "
        >
          <Plus className="h-3 w-3" />
          Add {target.level}
        </button>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Name"
          maxLength={100}
          disabled={isCreating}
          className="h-8 w-36 rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 text-xs outline-none focus:border-neutral-950 dark:focus:border-neutral-300 disabled:opacity-50 "
        />

        <input
          type="text"
          value={newCode}
          onChange={(event) => setNewCode(event.target.value)}
          placeholder="Code"
          maxLength={50}
          disabled={isCreating}
          className="h-8 w-24 rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 font-mono text-xs outline-none focus:border-neutral-950 dark:focus:border-neutral-300 disabled:opacity-50 "
        />

        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex h-8 items-center rounded-md bg-neutral-950 dark:bg-neutral-100 px-3 text-xs font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white disabled:opacity-50 "
        >
          {isCreating ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => setAddTarget(null)}
          disabled={isCreating}
          className="inline-flex h-8 items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 "
        >
          Cancel
        </button>
      </div>
    );
  };

  const handleDelete = async () => {
    if (!warehouse || user?.role !== "ADMIN") {
      return;
    }

    const confirmed = window.confirm(
      `Delete warehouse "${warehouse.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");

      const response = await fetch(
        `/api/warehouses/${warehouse.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        setError(await readError(response, "Unable to delete warehouse."));
        return;
      }

      router.push("/warehouses");
      router.refresh();
    } catch {
      setError("Unable to delete warehouse.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />

        <div className="h-28 animate-pulse rounded-xl bg-white dark:bg-neutral-900" />

        <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-neutral-900" />
      </div>
    );
  }

  if (error && !warehouse) {
    return (
      <div className="space-y-4">
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 "
        >
          <ArrowLeft className="h-4 w-4" />
          Warehouses
        </Link>

        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return null;
  }

  const totalCapacity = sumCapacity(storageSpaces);

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 "
        >
          <ArrowLeft className="h-4 w-4" />
          Warehouses
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-6 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <WarehouseIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400 " />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 ">
                  {warehouse.name}
                </h1>

                <StatusBadge status={warehouse.status} />
              </div>

              <p className="mt-1 font-mono text-sm text-neutral-500 dark:text-neutral-400">
                {warehouse.code}
              </p>

              {warehouse.address ? (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 ">
                  {warehouse.address}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/warehouses/${warehouse.id}/edit`}
              className="inline-flex h-9 items-center rounded-lg border border-neutral-300 dark:border-neutral-700 px-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 "
            >
              Edit
            </Link>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-9 items-center rounded-lg border border-red-200 dark:border-red-900 px-3.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total capacity
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 ">
            {formatCapacity(String(totalCapacity))}
          </p>

          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 ">
            Sum of all storage-space capacities
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Storage spaces
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 ">
            {storageSpaces.length}
          </p>

          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 ">
            Across {aisles.length}{" "}
            {aisles.length === 1 ? "aisle" : "aisles"}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100 ">
              Location hierarchy
            </h2>

            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Aisle → Bay → Layer → Storage space. Expand a
              level to drill down.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {renderAddForm({
              level: "aisle",
              parentId: warehouse.id,
            })}

            <Link
              href={`/storage-spaces/new?warehouse=${warehouse.id}`}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-neutral-950 dark:bg-neutral-100 px-2.5 text-xs font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white "
            >
              <Plus className="h-3 w-3" />
              Add space
            </Link>
          </div>
        </div>

        {aisles.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <h3 className="text-sm font-medium text-neutral-950 dark:text-neutral-100 ">
              No aisles yet
            </h3>

            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Add an aisle to start organizing storage
              locations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
            {aisles.map((aisle) => {
              const isExpanded = expandedAisles.includes(
                aisle.id,
              );
              const bays = baysByAisle[aisle.id] ?? [];
              const aisleSpaces = storageSpaces.filter(
                (space) =>
                  space.layerId &&
                  bays.some((bay) =>
                    (layersByBay[bay.id] ?? []).some(
                      (layer) => layer.id === space.layerId,
                    ),
                  ),
              );

              return (
                <div key={aisle.id}>
                  <button
                    type="button"
                    onClick={() => void toggleAisle(aisle)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 "
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                    )}

                    <span className="text-sm font-medium text-neutral-950 dark:text-neutral-100 ">
                      {aisle.name}
                    </span>

                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {aisle.code}
                    </span>

                    <StatusBadge status={aisle.status} />

                    <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">
                      {baysByAisle[aisle.id] !== undefined
                        ? `${bays.length} ${bays.length === 1 ? "bay" : "bays"} · ${formatCapacity(String(sumCapacity(aisleSpaces)))}`
                        : "Expand to view bays"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 px-5 py-3">
                      {loadingBays.includes(aisle.id) ? (
                        <p className="py-2 text-xs text-neutral-500 dark:text-neutral-400">
                          Loading bays...
                        </p>
                      ) : bays.length === 0 ? (
                        <div className="flex items-center justify-between gap-3 py-2">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            No bays in this aisle yet.
                          </p>

                          {renderAddForm({
                            level: "bay",
                            parentId: aisle.id,
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bays.map((bay) => {
                            const bayExpanded =
                              expandedBays.includes(bay.id);
                            const layers =
                              layersByBay[bay.id] ?? [];
                            const baySpaces =
                              storageSpaces.filter(
                                (space) =>
                                  space.layerId &&
                                  layers.some(
                                    (layer) =>
                                      layer.id ===
                                      space.layerId,
                                  ),
                              );

                            return (
                              <div
                                key={bay.id}
                                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    void toggleBay(bay)
                                  }
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 "
                                >
                                  {bayExpanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                                  )}

                                  <span className="text-sm font-medium text-neutral-950 dark:text-neutral-100 ">
                                    {bay.name}
                                  </span>

                                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                    {bay.code}
                                  </span>

                                  <StatusBadge
                                    status={bay.status}
                                  />

                                  <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">
                                    {layersByBay[bay.id] !==
                                    undefined
                                      ? `${layers.length} ${layers.length === 1 ? "layer" : "layers"} · ${formatCapacity(String(sumCapacity(baySpaces)))}`
                                      : "Expand to view layers"}
                                  </span>
                                </button>

                                {bayExpanded ? (
                                  <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
                                    {loadingLayers.includes(
                                      bay.id,
                                    ) ? (
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Loading layers...
                                      </p>
                                    ) : layers.length ===
                                      0 ? (
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                          No layers in this
                                          bay yet.
                                        </p>

                                        {renderAddForm({
                                          level: "layer",
                                          parentId: bay.id,
                                        })}
                                      </div>
                                    ) : (
                                      <>
                                        {layers.map(
                                          (layer) => {
                                            const layerSpaces =
                                              spacesByLayer[
                                                layer.id
                                              ] ?? [];

                                            return (
                                              <div
                                                key={
                                                  layer.id
                                                }
                                                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 px-4 py-3"
                                              >
                                                <div className="flex flex-wrap items-center gap-3">
                                                  <span className="text-sm font-medium text-neutral-950 dark:text-neutral-100 ">
                                                    {
                                                      layer.name
                                                    }
                                                  </span>

                                                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                                    {
                                                      layer.code
                                                    }
                                                  </span>

                                                  <StatusBadge
                                                    status={
                                                      layer.status
                                                    }
                                                  />

                                                  <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">
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
                                                        sumCapacity(
                                                          layerSpaces,
                                                        ),
                                                      ),
                                                    )}
                                                  </span>
                                                </div>

                                                {layerSpaces.length >
                                                0 ? (
                                                  <div className="mt-2 overflow-x-auto">
                                                    <table className="w-full min-w-[520px]">
                                                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
                                                        {layerSpaces.map(
                                                          (
                                                            space,
                                                          ) => (
                                                            <tr
                                                              key={
                                                                space.id
                                                              }
                                                              className="hover:bg-neutral-50 dark:hover:bg-neutral-800 "
                                                            >
                                                              <td className="py-2 pr-4 text-sm font-medium text-neutral-950 dark:text-neutral-100 ">
                                                                {
                                                                  space.name
                                                                }
                                                              </td>

                                                              <td className="py-2 pr-4 font-mono text-xs text-neutral-600 dark:text-neutral-400 ">
                                                                {
                                                                  space.code
                                                                }
                                                              </td>

                                                              <td className="py-2 pr-4 text-xs text-neutral-600 dark:text-neutral-400 ">
                                                                {
                                                                  space.storageType
                                                                }
                                                              </td>

                                                              <td className="py-2 pr-4 text-right font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                                                {formatCapacity(
                                                                  space.capacity,
                                                                )}
                                                              </td>

                                                              <td className="py-2">
                                                                <StatusBadge
                                                                  status={
                                                                    space.status
                                                                  }
                                                                />
                                                              </td>
                                                            </tr>
                                                          ),
                                                        )}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                ) : (
                                                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                    No storage
                                                    spaces in
                                                    this layer
                                                    yet.
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          },
                                        )}

                                        <div className="flex justify-end">
                                          {renderAddForm({
                                            level: "layer",
                                            parentId: bay.id,
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}

                          <div className="flex justify-end">
                            {renderAddForm({
                              level: "bay",
                              parentId: aisle.id,
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {unassignedSpaces.length > 0 ? (
          <div className="border-t border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 px-5 py-4">
            <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Unassigned spaces ({unassignedSpaces.length})
            </h3>

            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              Created before the location hierarchy — move
              them into a layer.
            </p>

            <ul className="mt-2 space-y-1">
              {unassignedSpaces.map((space) => (
                <li
                  key={space.id}
                  className="flex items-center gap-3 text-xs text-neutral-700 dark:text-neutral-300"
                >
                  <span className="font-medium">
                    {space.name}
                  </span>

                  <span className="font-mono text-neutral-500 dark:text-neutral-400">
                    {space.code}
                  </span>

                  <span className="ml-auto font-mono">
                    {formatCapacity(space.capacity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default WarehouseDetailPage;
