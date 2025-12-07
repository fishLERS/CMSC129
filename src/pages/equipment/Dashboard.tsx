import React from "react";
import { Boxes, Package, Recycle, AlertTriangle } from "lucide-react";

import { logicEquipment } from "./logicEquipment";
import AddEquipmentDialog from "./AddEquipmentDialog";
import EquipmentTable from "./EquipmentTable";

const LOW_STOCK_THRESHOLD = 5;

export default function Dashboard() {
  const { equipmentList, handleAdd, handleEdit, handleDelete } = logicEquipment();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "disposable" | "durable">("all");

  const categories = React.useMemo(() => {
    const unique = new Set<string>();
    equipmentList.forEach((item) => {
      unique.add(item.category?.trim() || "Uncategorized");
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [equipmentList]);

  const stats = React.useMemo(() => {
    const totalQuantity = equipmentList.reduce((sum, item) => sum + (item.totalInventory ?? 0), 0);
    const disposableCount = equipmentList.filter((item) => item.isDisposable).length;
    const lowStockCount = equipmentList.filter(
      (item) => (item.totalInventory ?? 0) <= LOW_STOCK_THRESHOLD
    ).length;

    return {
      totalQuantity,
      disposableCount,
      lowStockCount,
    };
  }, [equipmentList]);

  const filteredEquipment = React.useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return equipmentList.filter((item) => {
      const matchesSearch =
        !search ||
        item.name?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search);

      const categoryLabel = item.category?.trim() || "Uncategorized";
      const matchesCategory = categoryFilter === "all" || categoryLabel === categoryFilter;

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "disposable" ? item.isDisposable : !item.isDisposable);

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [equipmentList, searchTerm, categoryFilter, typeFilter]);

  const filtersActive =
    searchTerm.trim().length > 0 || categoryFilter !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment Inventory</h1>
          <p className="text-base-content/70">Monitor, add, and update equipment.</p>
        </div>
        <div className="flex gap-2">
          <AddEquipmentDialog onAdd={handleAdd} />
        </div>
      </div>

      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Boxes className="w-8 h-8" />
          </div>
          <div className="stat-title">Unique Items</div>
          <div className="stat-value">{equipmentList.length}</div>
          <div className="stat-desc">Active records</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <Package className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Quantity</div>
          <div className="stat-value">{stats.totalQuantity}</div>
          <div className="stat-desc">Items on-hand</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <Recycle className="w-8 h-8" />
          </div>
          <div className="stat-title">Disposable</div>
          <div className="stat-value">{stats.disposableCount}</div>
          <div className="stat-desc">Single-use supplies</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="stat-title">Low Stock (&le;{LOW_STOCK_THRESHOLD})</div>
          <div className="stat-value">{stats.lowStockCount}</div>
          <div className="stat-desc">Needs restock soon</div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Search equipment</span>
              </div>
              <input
                type="text"
                placeholder="Search by name or category"
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>

            <label className="form-control w-full lg:w-56">
              <div className="label">
                <span className="label-text">Category</span>
              </div>
              <select
                className="select select-bordered"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-full lg:w-48">
              <div className="label">
                <span className="label-text">Item Type</span>
              </div>
              <select
                className="select select-bordered"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "disposable" | "durable")}
              >
                <option value="all">All items</option>
                <option value="disposable">Disposable only</option>
                <option value="durable">Durable only</option>
              </select>
            </label>

            {filtersActive && (
              <button className="btn btn-ghost lg:self-center" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </div>

          <div className="text-sm text-base-content/70 flex flex-wrap items-center justify-between gap-2">
            <span>
              Showing <span className="font-semibold">{filteredEquipment.length}</span> of{" "}
              {equipmentList.length} records
            </span>
            <span className="badge badge-outline">
              {stats.totalQuantity} total pieces • {stats.disposableCount} disposable
            </span>
          </div>

          {filteredEquipment.length === 0 ? (
            <div className="border border-dashed border-base-300 rounded-box p-8 text-center text-base-content/70">
              No equipment matches the current filters.
            </div>
          ) : (
            <EquipmentTable
              equipmentList={filteredEquipment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
