"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { STORAGE_TYPES } from "@/lib/inventory/storage-type";

type StorageSpaceStatus = "ACTIVE" | "INACTIVE";

type StorageSpace = {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  capacity: string;
  storageType: string;
  status: StorageSpaceStatus;
  createdAt: string;
  updatedAt: string;
};

type StorageSpaceResponse = {
  data: StorageSpace;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const CAPACITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;

const EditStorageSpacePage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [storageSpace, setStorageSpace] =
    useState<StorageSpace | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState("");
  const [storageType, setStorageType] = useState("");
  const [status, setStatus] =
    useState<StorageSpaceStatus>("ACTIVE");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStorageSpace = async () => {
      try {
        setError("");

        const response = await fetch(
          `/api/storage-spaces/${params.id}`,
          {
            cache: "no-store",
          },
        );

        const data = (await response.json()) as
          | StorageSpaceResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load storage space."
              : "Unable to load storage space.",
          );
        }

        if (!("data" in data)) {
          throw new Error("Invalid storage space response.");
        }

        const space = data.data;

        setStorageSpace(space);
        setName(space.name);
        setCode(space.code);
        setCapacity(space.capacity);
        setStorageType(space.storageType);
        setStatus(space.status);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load storage space.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadStorageSpace();
  }, [params.id]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedStorageType = storageType.trim().toUpperCase();
    const trimmedCapacity = capacity.trim();

    if (!trimmedName) {
      setError("Storage space name is required.");
      return;
    }

    if (!trimmedCode) {
      setError("Storage space code is required.");
      return;
    }

    if (!trimmedStorageType) {
      setError("Storage type is required.");
      return;
    }

    if (
      !CAPACITY_PATTERN.test(trimmedCapacity) ||
      Number(trimmedCapacity) <= 0
    ) {
      setError(
        "Capacity must be a valid positive decimal with up to 9 integer digits and 3 decimal places.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/storage-spaces/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            code: trimmedCode,
            capacity: trimmedCapacity,
            storageType: trimmedStorageType,
            status,
          }),
        },
      );

      const data = (await response.json()) as
        | StorageSpaceResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to update storage space."
            : "Unable to update storage space.",
        );
      }

      if (!("data" in data)) {
        throw new Error("Invalid storage space response.");
      }

      router.push(`/storage-spaces/${data.data.id}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update storage space.",
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />

        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 " />

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800 "
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!storageSpace) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/storage-spaces"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 "
        >
          <ArrowLeft className="h-4 w-4" />
          Back to storage spaces
        </Link>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100 ">
            Storage space not found
          </h1>

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 ">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/storage-spaces/${storageSpace.id}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-950 dark:hover:text-neutral-100 "
      >
        <ArrowLeft className="h-4 w-4" />
        Back to storage space
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 ">
          Edit storage space
        </h1>

        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 ">
          Update the configuration for {storageSpace.name}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      >
        <div className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 "
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              disabled={isSubmitting}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Code
            </label>

            <input
              id="code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={50}
              disabled={isSubmitting}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="storageType"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Storage type
              </label>

              <select
                id="storageType"
                value={storageType}
                onChange={(event) =>
                  setStorageType(event.target.value)
                }
                disabled={isSubmitting}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              >
                <option value="">Select storage type</option>
                {STORAGE_TYPES.map((storageType) => (
                  <option key={storageType} value={storageType}>
                    {storageType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Capacity
              </label>

              <input
                id="capacity"
                type="text"
                inputMode="decimal"
                value={capacity}
                onChange={(event) =>
                  setCapacity(event.target.value)
                }
                disabled={isSubmitting}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
              />

              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 ">
                Capacity cannot be lower than currently allocated
                inventory.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Status
            </label>

            <select
              id="status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as StorageSpaceStatus,
                )
              }
              disabled={isSubmitting}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 "
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 px-6 py-4">
          <Link
            href={`/storage-spaces/${storageSpace.id}`}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 "
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-neutral-950 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-950 transition-colors hover:bg-neutral-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStorageSpacePage;