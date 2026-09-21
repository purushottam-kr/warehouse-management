"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ItemAllocationSummary } from "@/types/allocation";

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

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
};

type ItemResponse = {
  data: Item;
};

type AllocationSummaryResponse = {
  data: ItemAllocationSummary;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const formatQuantity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const ItemDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [summary, setSummary] =
    useState<ItemAllocationSummary | null>(null);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState("");
  const [inventoryError, setInventoryError] =
    useState("");
  const [deleteError, setDeleteError] =
    useState("");

  const loadCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        user?: CurrentUser;
      };

      setCurrentUser(data.user ?? null);
    } catch {
      setCurrentUser(null);
    }
  };

  const loadSummary = async () => {
    const response = await fetch(
      `/api/items/${params.id}/allocations`,
      {
        cache: "no-store",
      },
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
  };

  useEffect(() => {
    const loadItem = async () => {
      try {
        setIsLoading(true);
        setError("");
        setInventoryError("");
        setDeleteError("");
        setSummary(null);

        await loadCurrentUser();

        const itemResponse = await fetch(
          `/api/items/${params.id}`,
          {
            cache: "no-store",
          },
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

        setItem(itemData.data);

        /*
         * A failed inventory lookup must not hide
         * the item itself.
         */
        try {
          await loadSummary();
        } catch (summaryError) {
          setInventoryError(
            summaryError instanceof Error
              ? summaryError.message
              : "Unable to load inventory.",
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load item.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadItem();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDelete = async () => {
    if (!item || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete item "${item.name}" (${item.sku})? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError("");

      const response = await fetch(
        `/api/items/${item.id}`,
        {
          method: "DELETE",
        },
      );

      const data =
        (await response.json()) as
          | ItemResponse
          | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
              "Unable to delete item."
            : "Unable to delete item.",
        );
      }

      router.push("/items");
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete item.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />

        <div className="h-8 w-72 animate-pulse rounded bg-neutral-200" />

        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-white"
              />
            ),
          )}
        </div>

        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link
          href="/items"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to items
        </Link>

        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-950">
            Item not found
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            {error ||
              "The item may have been deleted or is no longer available."}
          </p>
        </div>
      </div>
    );
  }

  const locations = summary?.locations ?? [];
  const totalQuantity =
    summary?.totalQuantity ?? "0";

  /*
   * The API returns quantities as exact decimal strings.
   * An item is deletable only when its total allocated
   * quantity is exactly zero.
   */
  const isZeroQuantity =
    /^0(?:\.0+)?$/.test(totalQuantity);

  const canDelete =
    currentUser?.role === "ADMIN" &&
    isZeroQuantity &&
    !inventoryError;

  return (
    <div className="space-y-6">
      <Link
        href="/items"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Items
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-sm text-neutral-500">
            {item.sku}
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            {item.name}
          </h1>

          {item.description ? (
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/items/${item.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>

          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting
                ? "Deleting..."
                : "Delete"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {deleteError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {deleteError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Required storage
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {item.requiredStorageType ?? "Any"}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {item.requiredStorageType
              ? "Allocations target this storage type."
              : "No storage type restriction."}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Total inventory
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {formatQuantity(totalQuantity)}{" "}
            <span className="text-sm font-normal text-neutral-500">
              {item.unit}
            </span>
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Sum of all allocations.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Storage locations
          </p>

          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {locations.length}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Distinct spaces holding this item.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950">
            Storage locations
          </h2>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/allocations?itemId=${item.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <ArrowUpRight className="h-4 w-4" />
              Allocate inventory
            </Link>

            <Link
              href={`/transfers?itemId=${item.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfer inventory
            </Link>

            <Link
              href={`/releases?itemId=${item.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Release inventory
            </Link>
          </div>
        </div>

        {inventoryError ? (
          <div
            role="alert"
            className="border-b border-neutral-200 px-5 py-3 text-sm text-red-700"
          >
            {inventoryError}
          </div>
        ) : null}

        {locations.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
              <MapPin className="h-5 w-5 text-neutral-500" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-neutral-950">
              No inventory allocated
            </h3>

            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              Allocate inventory to store this item
              in eligible storage spaces.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Storage space
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Warehouse
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Storage type
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Quantity
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {locations.map((location) => (
                  <tr
                    key={location.storageSpaceId}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-neutral-950">
                        {location.storageSpaceName}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-neutral-500">
                        {location.storageSpaceCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600">
                      {location.warehouseName}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-medium text-neutral-600">
                        {location.storageType}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm text-neutral-950">
                      {formatQuantity(
                        location.quantity,
                      )}{" "}
                      <span className="font-sans text-xs text-neutral-500">
                        {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-950">
            Item details
          </h2>
        </div>

        <div className="grid gap-px bg-neutral-200 sm:grid-cols-2">
          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              SKU
            </p>

            <p className="mt-1 font-mono text-sm font-medium text-neutral-950">
              {item.sku}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Unit
            </p>

            <p className="mt-1 text-sm font-medium text-neutral-950">
              {item.unit}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Created
            </p>

            <p className="mt-1 text-sm font-medium text-neutral-950">
              {formatDate(item.createdAt)}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Last updated
            </p>

            <p className="mt-1 text-sm font-medium text-neutral-950">
              {formatDate(item.updatedAt)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ItemDetailPage;