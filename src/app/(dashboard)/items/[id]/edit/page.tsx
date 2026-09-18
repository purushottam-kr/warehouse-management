"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  requiredStorageType: string | null;
};

type ItemResponse = {
  data: Item;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const EditItemPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [unit, setUnit] = useState("");
  const [requiredStorageType, setRequiredStorageType] =
    useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadItem = async () => {
      try {
        setError("");

        const response = await fetch(
          `/api/items/${params.id}`,
          { cache: "no-store" },
        );

        const data = (await response.json()) as
          | ItemResponse
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error?.message ??
                  "Unable to load item."
              : "Unable to load item.",
          );
        }

        if (!("data" in data)) {
          throw new Error(
            "Invalid item response.",
          );
        }

        const loadedItem = data.data;

        setItem(loadedItem);
        setSku(loadedItem.sku);
        setName(loadedItem.name);
        setDescription(loadedItem.description ?? "");
        setUnit(loadedItem.unit);
        setRequiredStorageType(
          loadedItem.requiredStorageType ?? "",
        );
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
  }, [params.id]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const trimmedSku = sku.trim();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedUnit = unit.trim();
    const trimmedStorageType =
      requiredStorageType.trim().toUpperCase();

    if (!trimmedSku) {
      setError("SKU is required.");
      return;
    }

    if (!trimmedName) {
      setError("Item name is required.");
      return;
    }

    if (!trimmedUnit) {
      setError("Unit is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/items/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sku: trimmedSku,
            name: trimmedName,
            description: trimmedDescription || null,
            unit: trimmedUnit,
            requiredStorageType:
              trimmedStorageType || null,
          }),
        },
      );

      const data = (await response.json()) as
        | ItemResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to update item."
            : "Unable to update item.",
        );
      }

      if (!("data" in data)) {
        throw new Error(
          "Invalid item response.",
        );
      }

      router.push(`/items/${data.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update item.",
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />

        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="space-y-5">
            {Array.from({ length: 5 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse rounded-lg bg-neutral-100"
                />
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl space-y-4">
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

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/items/${item.id}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to item
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Edit item
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Update the configuration for{" "}
          <span className="font-medium text-neutral-950">
            {item.name}
          </span>
          .
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-6"
      >
        <div className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="sku"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              SKU
            </label>

            <input
              id="sku"
              type="text"
              value={sku}
              onChange={(event) =>
                setSku(event.target.value)
              }
              required
              maxLength={50}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />

            <p className="mt-1.5 text-xs text-neutral-500">
              Must be unique across all items.
            </p>
          </div>

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Item name
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
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Description
              <span className="ml-1 font-normal text-neutral-400">
                Optional
              </span>
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              maxLength={1000}
              disabled={isSubmitting}
              className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />

            <p className="mt-1.5 text-xs text-neutral-500">
              Leave empty to remove the description.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="unit"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Unit
              </label>

              <input
                id="unit"
                type="text"
                value={unit}
                onChange={(event) =>
                  setUnit(event.target.value)
                }
                required
                maxLength={30}
                disabled={isSubmitting}
                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
              />
            </div>

            <div>
              <label
                htmlFor="requiredStorageType"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Required storage type
                <span className="ml-1 font-normal text-neutral-400">
                  Optional
                </span>
              </label>

              <input
                id="requiredStorageType"
                type="text"
                value={requiredStorageType}
                onChange={(event) =>
                  setRequiredStorageType(
                    event.target.value,
                  )
                }
                maxLength={50}
                disabled={isSubmitting}
                className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm uppercase text-neutral-950 outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
              />

              <p className="mt-1.5 text-xs text-neutral-500">
                Leave empty for no restriction.
                Allocations only target storage
                spaces of this type.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 pt-5">
          <Link
            href={`/items/${item.id}`}
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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

export default EditItemPage;
