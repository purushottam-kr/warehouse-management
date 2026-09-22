"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import type { WarehouseStatus } from "@/types/warehouse";

type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status: WarehouseStatus;
};

type WarehouseResponse = {
  data: Warehouse;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const EditWarehousePage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [warehouse, setWarehouse] =
    useState<Warehouse | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] =
    useState<WarehouseStatus>("ACTIVE");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWarehouse = async () => {
      try {
        setError("");

        const response = await fetch(
          `/api/warehouses/${params.id}`,
          { cache: "no-store" },
        );

        const data = (await response.json()) as
          | WarehouseResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load warehouse."
              : "Unable to load warehouse.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid warehouse response.",
          );
        }

        const loadedWarehouse = data.data;

        setWarehouse(loadedWarehouse);
        setName(loadedWarehouse.name);
        setCode(loadedWarehouse.code);
        setAddress(loadedWarehouse.address ?? "");
        setStatus(loadedWarehouse.status);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load warehouse.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadWarehouse();
  }, [params.id]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setError("Warehouse name is required.");
      return;
    }

    if (!trimmedCode) {
      setError("Warehouse code is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/warehouses/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            code: trimmedCode,
            address: trimmedAddress || null,
            status,
          }),
        },
      );

      const data = (await response.json()) as
        | WarehouseResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to update warehouse."
            : "Unable to update warehouse.",
        );
      }

      if (!("data" in data)) {
        throw new Error(
          "Invalid warehouse response.",
        );
      }

      router.push(`/warehouses/${data.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update warehouse.",
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />

        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <div className="space-y-5">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
                />
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to warehouses
        </Link>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
            Warehouse not found
          </h1>

          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {error ||
              "The warehouse may have been deleted or is no longer available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/warehouses/${warehouse.id}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to warehouse
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
          Edit warehouse
        </h1>

        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Update the configuration for{" "}
          <span className="font-medium text-neutral-950 dark:text-neutral-100">
            {warehouse.name}
          </span>
          .
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6"
      >
        <div className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 "
            >
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
            >
              Name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              maxLength={100}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
            >
              Code
            </label>

            <input
              id="code"
              type="text"
              value={code}
              onChange={(event) =>
                setCode(event.target.value)
              }
              required
              maxLength={50}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 font-mono text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            />

            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Must be unique across all warehouses.
            </p>
          </div>

          <div>
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
            >
              Address
              <span className="ml-1 font-normal text-neutral-400 dark:text-neutral-500 ">
                Optional
              </span>
            </label>

            <textarea
              id="address"
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
              rows={3}
              maxLength={255}
              disabled={isSubmitting}
              className="w-full resize-none rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            />

            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Leave empty to remove the address.
            </p>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
            >
              Status
            </label>

            <select
              id="status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as WarehouseStatus,
                )
              }
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">
                Inactive
              </option>
            </select>

            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Inactive warehouses are excluded from
              new inventory allocations.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-5">
          <Link
            href={`/warehouses/${warehouse.id}`}
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center rounded-lg bg-neutral-950 dark:bg-neutral-100 px-4 text-sm font-medium text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditWarehousePage;
