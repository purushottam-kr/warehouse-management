"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const NewWarehousePage = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/warehouses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          address: address || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error?.message ??
            "Unable to create warehouse.",
        );
        return;
      }

      router.push(`/warehouses/${data.data.id}`);
      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Warehouses
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            New warehouse
          </h1>

          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Add a warehouse location to your organization.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6"
      >
        <div className="space-y-5">
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
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Main Warehouse"
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 "
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
              onChange={(event) => setCode(event.target.value)}
              required
              placeholder="WH-001"
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 font-mono text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:font-sans placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 "
            />

            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Use a unique code to identify this warehouse.
            </p>
          </div>

          <div>
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200 "
            >
              Address
              <span className="ml-1 font-normal text-neutral-400 dark:text-neutral-500">
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
              placeholder="Warehouse address"
              className="w-full resize-none rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-950 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 "
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 "
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-5">
          <Link
            href="/warehouses"
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center rounded-lg bg-neutral-950 dark:bg-neutral-100 px-4 text-sm font-medium text-white dark:text-neutral-950 dark:text-neutral-100 hover:bg-neutral-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Creating..."
              : "Create warehouse"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewWarehousePage;