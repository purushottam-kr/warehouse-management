"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
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

type ApiResponse = {
  data: StorageSpace;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type UserResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "STAFF";
  };
};

const formatCapacity = (value: string) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatStorageType = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const StorageSpaceDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [storageSpace, setStorageSpace] = useState<StorageSpace | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStorageSpace = async () => {
      try {
        setError("");

        const [storageResponse, warehouseResponse, userResponse] =
          await Promise.all([
            fetch(`/api/storage-spaces/${params.id}`, {
              cache: "no-store",
            }),
            fetch("/api/warehouses", {
              cache: "no-store",
            }),
            fetch("/api/auth/me", {
              cache: "no-store",
            }),
          ]);

        const storageData =
          (await storageResponse.json()) as
            | ApiResponse
            | ApiErrorResponse;

        const warehouseData = (await warehouseResponse.json()) as
          | {
              data: Array<{
                id: string;
                name: string;
              }>;
            }
          | ApiErrorResponse;

        const userData =
          (await userResponse.json()) as UserResponse | ApiErrorResponse;

        if (!storageResponse.ok) {
          throw new Error(
            "error" in storageData
              ? storageData.error?.message ?? "Unable to load storage space."
              : "Unable to load storage space.",
          );
        }

        if (!warehouseResponse.ok) {
          throw new Error("Unable to load warehouse information.");
        }

        if (!userResponse.ok) {
          throw new Error("Unable to load user information.");
        }

        if (
          !("data" in storageData) ||
          !("data" in warehouseData) ||
          !("user" in userData)
        ) {
          throw new Error("Invalid storage space response.");
        }

        const warehouse = warehouseData.data.find(
          (item) => item.id === storageData.data.warehouseId,
        );

        setStorageSpace(storageData.data);
        setWarehouseName(warehouse?.name ?? "Unknown warehouse");
        setIsAdmin(userData.user.role === "ADMIN");
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

  const handleDelete = async () => {
    if (!storageSpace || !isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${storageSpace.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/storage-spaces/${storageSpace.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as
        | ApiResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ?? "Unable to delete storage space."
            : "Unable to delete storage space.",
        );
      }

      router.push("/storage-spaces");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete storage space.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!storageSpace) {
    return (
      <div className="space-y-4">
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
          <p className="mt-2 text-sm text-slate-500">
            The storage space may have been deleted or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/storage-spaces"
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to storage spaces
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {storageSpace.name}
            </h1>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                storageSpace.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {storageSpace.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {warehouseName} · {storageSpace.code}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/storage-spaces/${storageSpace.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>

          {isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Storage space details
          </h2>
        </div>

        <div className="grid gap-px bg-slate-200 md:grid-cols-2">
          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Warehouse
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {warehouseName}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Storage type
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {formatStorageType(storageSpace.storageType)}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Capacity
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {formatCapacity(storageSpace.capacity)}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {storageSpace.status}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Created
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {formatDate(storageSpace.createdAt)}
            </p>
          </div>

          <div className="bg-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Last updated
            </p>
            <p className="mt-1 text-sm font-medium text-slate-950">
              {formatDate(storageSpace.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Inventory</h2>
        </div>

        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            Inventory details will appear here.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Item-level allocation data will be added when the inventory view is
            connected.
          </p>
        </div>
      </section>
    </div>
  );
};

export default StorageSpaceDetailPage;