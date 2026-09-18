"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  FormEvent,
  useEffect,
  useState,
} from "react";

import type {
  ItemAllocationLocation,
  ItemAllocationSummary,
} from "@/types/allocation";

type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  requiredStorageType: string | null;
  createdAt: string;
  updatedAt: string;
};

type ItemResponse = {
  data: Item;
};

type AllocationSummaryResponse = {
  data: ItemAllocationSummary;
};

type StorageSpace = {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
  status: "ACTIVE" | "INACTIVE";
};

type TransferResultResponse = {
  itemId: string;
  fromStorageSpaceId: string;
  toStorageSpaceId: string;
  quantity: string;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const QUANTITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;

const formatQuantity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const TransfersWorkspace = () => {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] =
    useState(true);
  const [itemsError, setItemsError] = useState("");

  const [selectedItemId, setSelectedItemId] =
    useState("");
  const [item, setItem] = useState<Item | null>(null);
  const [summary, setSummary] =
    useState<ItemAllocationSummary | null>(null);

  const [isLoadingItem, setIsLoadingItem] =
    useState(false);
  const [itemError, setItemError] = useState("");
  const [inventoryError, setInventoryError] =
    useState("");

  const [spaces, setSpaces] = useState<
    StorageSpace[]
  >([]);
  const [warehouseNames, setWarehouseNames] =
    useState<Map<string, string>>(new Map());
  const [isLoadingSpaces, setIsLoadingSpaces] =
    useState(true);

  const [fromSpaceId, setFromSpaceId] =
    useState("");
  const [toSpaceId, setToSpaceId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState("");
  const [isTransferring, setIsTransferring] =
    useState(false);

  type TransferSnapshot = {
    transfer: TransferResultResponse;
    beforeLocations: ItemAllocationLocation[];
    afterLocations: ItemAllocationLocation[];
  };

  const [result, setResult] =
    useState<TransferSnapshot | null>(null);

  const loadSummary = async (itemId: string) => {
    const response = await fetch(
      `/api/items/${itemId}/allocations`,
      { cache: "no-store" },
    );

    const data =
      (await response.json()) as
        | AllocationSummaryResponse
        | ApiErrorResponse;

    if (!response.ok) {
      throw new Error(
        "error" in data
          ? data.error?.message ??
              "Unable to load inventory."
          : "Unable to load inventory.",
      );
    }

    if (!("data" in data)) {
      throw new Error(
        "Invalid inventory response.",
      );
    }

    setSummary(data.data);

    return data.data;
  };

  const selectItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    setItem(null);
    setSummary(null);
    setResult(null);
    setFromSpaceId("");
    setToSpaceId("");
    setQuantity("");
    setFormError("");
    setItemError("");
    setInventoryError("");

    if (!itemId) {
      return;
    }

    setIsLoadingItem(true);

    try {
      const itemResponse = await fetch(
        `/api/items/${itemId}`,
        { cache: "no-store" },
      );

      const itemData =
        (await itemResponse.json()) as
          | ItemResponse
          | ApiErrorResponse;

      if (!itemResponse.ok) {
        throw new Error(
          "error" in itemData
            ? itemData.error?.message ??
                "Unable to load item."
            : "Unable to load item.",
        );
      }

      if (!("data" in itemData)) {
        throw new Error(
          "Invalid item response.",
        );
      }

      const loadedItem = itemData.data;

      setItem(loadedItem);

      /*
       * A deep-linked item may be missing from the
       * dropdown list; add it so the select displays
       * the correct label.
       */
      setItems((currentItems) =>
        currentItems.some(
          (entry) => entry.id === loadedItem.id,
        )
          ? currentItems
          : [loadedItem, ...currentItems],
      );

      try {
        await loadSummary(itemId);
      } catch (summaryError) {
        setInventoryError(
          summaryError instanceof Error
            ? summaryError.message
            : "Unable to load inventory.",
        );
      }
    } catch (loadError) {
      setItemError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load item.",
      );
    } finally {
      setIsLoadingItem(false);
    }
  };

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const [spacesResponse, warehousesResponse] =
          await Promise.all([
            fetch("/api/storage-spaces", {
              cache: "no-store",
            }),
            fetch("/api/warehouses", {
              cache: "no-store",
            }),
          ]);

        const spacesData =
          (await spacesResponse.json()) as
            | { data: StorageSpace[] }
            | ApiErrorResponse;

        const warehousesData =
          (await warehousesResponse.json()) as
            | {
                data: Array<{
                  id: string;
                  name: string;
                }>;
              }
            | ApiErrorResponse;

        if (!spacesResponse.ok) {
          throw new Error(
            "error" in spacesData
              ? spacesData.error?.message ??
                  "Unable to load storage spaces."
              : "Unable to load storage spaces.",
          );
        }

        if (!("data" in spacesData)) {
          throw new Error(
            "Invalid storage space response.",
          );
        }

        setSpaces(spacesData.data);

        if (warehousesResponse.ok) {
          if ("data" in warehousesData) {
            setWarehouseNames(
              new Map(
                warehousesData.data.map(
                  (warehouse) => [
                    warehouse.id,
                    warehouse.name,
                  ],
                ),
              ),
            );
          }
        }
      } catch (loadError) {
        setItemsError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load storage spaces.",
        );
      } finally {
        setIsLoadingSpaces(false);
      }
    };

    void loadWorkspace();
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch("/api/items", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as
          | { data: Item[] }
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load items."
              : "Unable to load items.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid item response.",
          );
        }

        setItems(data.data);
      } catch (error) {
        setItemsError(
          error instanceof Error
            ? error.message
            : "Unable to load items.",
        );
      } finally {
        setIsLoadingItems(false);

        /*
         * Preselect an item linked from
         * /transfers?itemId=...
         *
         * Runs in the async continuation so a deep
         * link preselects even if the list request
         * failed.
         */
        const preselectedItemId =
          searchParams.get("itemId");

        if (preselectedItemId) {
          await selectItem(preselectedItemId);
        }
      }
    };

    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceLocations =
    summary?.locations ?? [];

  const selectedFromSpace = spaces.find(
    (space) => space.id === fromSpaceId,
  );

  const selectedToSpace = spaces.find(
    (space) => space.id === toSpaceId,
  );

  const handleTransfer = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setFormError("");

    if (!item) {
      return;
    }

    const trimmedQuantity = quantity.trim();

    if (
      !QUANTITY_PATTERN.test(trimmedQuantity) ||
      Number(trimmedQuantity) <= 0
    ) {
      setFormError(
        "Quantity must be a valid decimal with up to 9 integer digits and 3 decimal places.",
      );
      return;
    }

    if (!fromSpaceId || !toSpaceId) {
      setFormError(
        "Select a source and destination storage space.",
      );
      return;
    }

    if (fromSpaceId === toSpaceId) {
      setFormError(
        "Source and destination storage spaces must be different.",
      );
      return;
    }

    setIsTransferring(true);

    try {
      /*
       * Snapshot before submitting; the refetch after
       * the transfer is authoritative for the
       * resulting state.
       */
      const beforeLocations = summary
        ? summary.locations
        : [];

      const response = await fetch(
        "/api/transfers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId: item.id,
            fromStorageSpaceId: fromSpaceId,
            toStorageSpaceId: toSpaceId,
            quantity: trimmedQuantity,
          }),
        },
      );

      const data = (await response.json()) as
        | TransferResultResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to transfer inventory."
            : "Unable to transfer inventory.",
        );
      }

      if (
        !("itemId" in data) ||
        !("fromStorageSpaceId" in data) ||
        !("toStorageSpaceId" in data) ||
        !("quantity" in data)
      ) {
        throw new Error(
          "Invalid transfer response.",
        );
      }

      let afterLocations = beforeLocations;

      try {
        const after = await loadSummary(item.id);

        afterLocations = after.locations;
      } catch {
        setInventoryError(
          "Transfer succeeded, but the inventory overview could not be refreshed.",
        );
      }

      setResult({
        transfer: data,
        beforeLocations,
        afterLocations,
      });
      setQuantity("");
      setFromSpaceId("");
      setToSpaceId("");
    } catch (transferError) {
      setFormError(
        transferError instanceof Error
          ? transferError.message
          : "Unable to transfer inventory.",
      );
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Transfer inventory
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Move allocated inventory between storage
          spaces.
        </p>
      </div>

      {itemsError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {itemsError}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-emerald-200 bg-white">
          <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                Transfer successful
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                {formatQuantity(
                  result.transfer.quantity,
                )}{" "}
                {item?.unit ?? "units"} moved
              </p>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Resulting quantities
            </p>

            <ul className="mt-3 divide-y divide-neutral-100">
              {[
                result.transfer.fromStorageSpaceId,
                result.transfer.toStorageSpaceId,
              ].map((spaceId) => {
                const before =
                  result.beforeLocations.find(
                    (location) =>
                      location.storageSpaceId ===
                      spaceId,
                  );

                const after =
                  result.afterLocations.find(
                    (location) =>
                      location.storageSpaceId ===
                      spaceId,
                  );

                const name =
                  before?.storageSpaceName ??
                  after?.storageSpaceName ??
                  "Storage space";

                const code =
                  before?.storageSpaceCode ??
                  after?.storageSpaceCode;

                return (
                  <li
                    key={spaceId}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-950">
                        {name}
                      </p>

                      {code ? (
                        <p className="mt-0.5 font-mono text-xs text-neutral-500">
                          {code}
                        </p>
                      ) : null}
                    </div>

                    <p className="font-mono text-sm text-neutral-950">
                      {formatQuantity(
                        before?.quantity ?? "0",
                      )}{" "}
                      →{" "}
                      {formatQuantity(
                        after?.quantity ?? "0",
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-xs text-neutral-500">
              Quantities reflect the item&apos;s
              current allocation summary.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuantity("");
              }}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            >
              Transfer more
            </button>

            {item ? (
              <Link
                href={`/items/${item.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                View item
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleTransfer}
          className="rounded-xl border border-neutral-200 bg-white p-6"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="item"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Item
              </label>

              <select
                id="item"
                value={selectedItemId}
                onChange={(event) =>
                  void selectItem(
                    event.target.value,
                  )
                }
                disabled={
                  isLoadingItems ||
                  isTransferring ||
                  items.length === 0
                }
                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
              >
                <option value="">
                  {isLoadingItems
                    ? "Loading items..."
                    : "Select an item"}
                </option>

                {items.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.name} — {option.sku}
                  </option>
                ))}
              </select>
            </div>

            {isLoadingItem ? (
              <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />

                <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />

                <div className="h-16 animate-pulse rounded bg-neutral-100" />
              </div>
            ) : item ? (
              <>
                <div>
                  <label
                    htmlFor="from"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    From
                  </label>

                  <select
                    id="from"
                    value={fromSpaceId}
                    onChange={(event) =>
                      setFromSpaceId(
                        event.target.value,
                      )
                    }
                    disabled={
                      isTransferring ||
                      isLoadingSpaces ||
                      sourceLocations.length === 0
                    }
                    className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  >
                    <option value="">
                      {isLoadingSpaces
                        ? "Loading storage spaces..."
                        : sourceLocations.length ===
                            0
                          ? "No allocated locations"
                          : "Select source location"}
                    </option>

                    {sourceLocations.map(
                      (location) => (
                        <option
                          key={
                            location.storageSpaceId
                          }
                          value={
                            location.storageSpaceId
                          }
                        >
                          {
                            location.storageSpaceName
                          }{" "}
                          —{" "}
                          {
                            location.storageSpaceCode
                          }
                        </option>
                      ),
                    )}
                  </select>

                  {fromSpaceId ? (
                    <div className="mt-3 rounded-lg border border-neutral-200 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Available
                      </p>

                      <p className="mt-1 text-lg font-semibold text-neutral-950">
                        {formatQuantity(
                          sourceLocations.find(
                            (location) =>
                              location.storageSpaceId ===
                              fromSpaceId,
                          )?.quantity ?? "0",
                        )}{" "}
                        <span className="text-sm font-normal text-neutral-500">
                          {item.unit}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        Currently allocated in{" "}
                        {
                          selectedFromSpace?.name ??
                            "the selected space"
                        }
                        .
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="to"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    To
                  </label>

                  <select
                    id="to"
                    value={toSpaceId}
                    onChange={(event) =>
                      setToSpaceId(
                        event.target.value,
                      )
                    }
                    disabled={
                      isTransferring ||
                      isLoadingSpaces ||
                      spaces.length === 0
                    }
                    className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  >
                    <option value="">
                      {isLoadingSpaces
                        ? "Loading storage spaces..."
                        : "Select destination"}
                    </option>

                    {spaces.map((space) => (
                      <option
                        key={space.id}
                        value={space.id}
                        disabled={
                          space.id === fromSpaceId
                        }
                      >
                        {space.name} —{" "}
                        {space.code}
                      </option>
                    ))}
                  </select>

                  {selectedToSpace ? (
                    <div className="mt-3 rounded-lg border border-neutral-200 p-4">
                      <p className="text-sm font-medium text-neutral-950">
                        {selectedToSpace.name}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-neutral-500">
                        {selectedToSpace.code}
                      </p>

                      <p className="mt-2 text-xs text-neutral-500">
                        {
                          warehouseNames.get(
                            selectedToSpace.warehouseId,
                          ) ??
                            "Unknown warehouse"
                        }{" "}
                        ·{" "}
                        {
                          selectedToSpace.storageType
                        }
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Quantity
                  </label>

                  <input
                    id="quantity"
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    placeholder="25.000"
                    disabled={isTransferring}
                    className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-950 outline-none placeholder:font-sans placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  />
                </div>

                {inventoryError ? (
                  <p
                    role="alert"
                    className="text-xs text-red-600"
                  >
                    {inventoryError}
                  </p>
                ) : null}

                {formError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  >
                    {formError}
                  </div>
                ) : null}
              </>
            ) : itemError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {itemError}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Select an item to choose source and
                destination storage spaces.
              </p>
            )}
          </div>

          {item ? (
            <div className="mt-6 flex items-center justify-end border-t border-neutral-100 pt-5">
              <button
                type="submit"
                disabled={
                  isTransferring ||
                  !fromSpaceId ||
                  !toSpaceId ||
                  fromSpaceId === toSpaceId
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTransferring ? (
                  "Transferring..."
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer inventory
                  </>
                )}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
};

const TransfersPage = () => {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />

          <div className="h-96 animate-pulse rounded-xl border border-neutral-200 bg-white" />
        </div>
      }
    >
      <TransfersWorkspace />
    </Suspense>
  );
};

export default TransfersPage;
