"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ItemResponse = {
  data: {
    id: string;
  };
};

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
  };
};

const NewItemPage = () => {
  const router = useRouter();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [unit, setUnit] = useState("");
  const [requiredStorageType, setRequiredStorageType] =
    useState("");

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku,
          name,
          description: description || undefined,
          unit,
          requiredStorageType:
            requiredStorageType || undefined,
        }),
      });

      const data = (await response.json()) as
        | ItemResponse
        | ApiErrorResponse;

      if (!response.ok) {
        if ("error" in data) {
          const fieldErrors =
            data.error?.details?.fieldErrors ?? {};

          setFieldErrors(
            Object.fromEntries(
              Object.entries(fieldErrors).map(
                ([field, messages]) => [
                  field,
                  messages[0],
                ],
              ),
            ),
          );

          setError(
            data.error?.message ??
              "Unable to create item.",
          );
        } else {
          setError("Unable to create item.");
        }

        return;
      }

      if (!("data" in data)) {
        setError("Invalid item response.");
        return;
      }

      router.push(`/items/${data.data.id}`);
      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50";

  const labelClassName =
    "mb-2 block text-sm font-medium text-neutral-800";

  const fieldErrorClassName =
    "mt-1.5 text-xs text-red-600";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/items"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Items
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            New item
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Add a product to your catalog.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-6"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="sku"
              className={labelClassName}
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
              placeholder="SKU-0001"
              aria-invalid={
                fieldErrors.sku ? true : undefined
              }
              className={`${inputClassName} font-mono placeholder:font-sans`}
            />

            {fieldErrors.sku ? (
              <p
                role="alert"
                className={fieldErrorClassName}
              >
                {fieldErrors.sku}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-neutral-500">
                Unique identifier, up to 50
                characters.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="name"
              className={labelClassName}
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
              placeholder="Product A"
              aria-invalid={
                fieldErrors.name ? true : undefined
              }
              className={inputClassName}
            />

            {fieldErrors.name ? (
              <p
                role="alert"
                className={fieldErrorClassName}
              >
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="description"
              className={labelClassName}
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
              placeholder="Short description of the item"
              aria-invalid={
                fieldErrors.description
                  ? true
                  : undefined
              }
              className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />

            {fieldErrors.description ? (
              <p
                role="alert"
                className={fieldErrorClassName}
              >
                {fieldErrors.description}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-neutral-500">
                Up to 1000 characters.
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="unit"
                className={labelClassName}
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
                placeholder="pcs"
                aria-invalid={
                  fieldErrors.unit ? true : undefined
                }
                className={inputClassName}
              />

              {fieldErrors.unit ? (
                <p
                  role="alert"
                  className={fieldErrorClassName}
                >
                  {fieldErrors.unit}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-neutral-500">
                  e.g. pcs, kg, box.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="requiredStorageType"
                className={labelClassName}
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
                placeholder="COLD"
                aria-invalid={
                  fieldErrors.requiredStorageType
                    ? true
                    : undefined
                }
                className={`${inputClassName} font-mono uppercase placeholder:font-sans`}
              />

              {fieldErrors.requiredStorageType ? (
                <p
                  role="alert"
                  className={fieldErrorClassName}
                >
                  {
                    fieldErrors.requiredStorageType
                  }
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-neutral-500">
                  e.g. COLD, DRY, FROZEN. Allocations
                  only target storage spaces of this
                  type.
                </p>
              )}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 pt-5">
          <Link
            href="/items"
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
              ? "Creating..."
              : "Create item"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewItemPage;
