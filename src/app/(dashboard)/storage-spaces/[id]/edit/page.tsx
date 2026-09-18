"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />

        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded bg-slate-100"
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
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to storage spaces
        </Link>

        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-950">
            Storage space not found
          </h1>

          {error && (
            <p className="mt-2 text-sm text-red-600">
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
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to storage space
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Edit storage space
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Update the configuration for {storageSpace.name}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white"
      >
        <div className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="storageType"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Storage type
              </label>

              <input
                id="storageType"
                type="text"
                value={storageType}
                onChange={(event) =>
                  setStorageType(event.target.value)
                }
                maxLength={50}
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="mb-1.5 block text-sm font-medium text-slate-700"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
              />

              <p className="mt-1.5 text-xs text-slate-500">
                Capacity cannot be lower than currently allocated
                inventory.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <Link
            href={`/storage-spaces/${storageSpace.id}`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStorageSpacePage;