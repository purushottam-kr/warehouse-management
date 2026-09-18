"use client";

import Link from "next/link";
import {
  Boxes,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { Item } from "@/types/item";

type ItemsResponse = {
  data: Item[];
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const ItemsPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch("/api/items", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as
          | ItemsResponse
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
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load items.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadItems();
  }, []);

  const normalizedSearch = search
    .trim()
    .toLowerCase();

  const filteredItems = normalizedSearch
    ? items.filter(
        (item) =>
          item.sku
            .toLowerCase()
            .includes(normalizedSearch) ||
          item.name
            .toLowerCase()
            .includes(normalizedSearch),
      )
    : items;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Items
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage product catalog and storage
            requirements.
          </p>
        </div>

        <Link
          href="/items/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          New item
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by SKU or name"
            aria-label="Search items"
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 sm:max-w-sm"
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-neutral-100" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
                  </div>

                  <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-100" />
                </div>
              ),
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
              <Boxes className="h-5 w-5 text-neutral-500" />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950">
              No items yet
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              Create your first item to start
              tracking inventory and storage
              requirements.
            </p>

            <Link
              href="/items/new"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4" />
              Create item
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-950">
              No items match “{search}”
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Try a different SKU or name.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    SKU
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Item name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Unit
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Required storage
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                    <span className="sr-only">
                      View
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="group transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/items/${item.id}`}
                        className="font-mono text-sm text-neutral-950 hover:underline"
                      >
                        {item.sku}
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/items/${item.id}`}
                        className="font-medium text-neutral-950 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600">
                      {item.unit}
                    </td>

                    <td className="px-5 py-4">
                      {item.requiredStorageType ? (
                        <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-medium text-neutral-600">
                          {
                            item.requiredStorageType
                          }
                        </span>
                      ) : (
                        <span className="text-sm text-neutral-400">
                          Any
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/items/${item.id}`}
                        className="text-sm font-medium text-neutral-600 hover:text-neutral-950 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsPage;
