const DashboardPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-neutral-500">
          Overview
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
          Warehouse operations
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          Manage warehouses, storage spaces, and inventory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Warehouses
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            —
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Storage spaces
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            —
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Items
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            —
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Allocated inventory
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">
            —
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;