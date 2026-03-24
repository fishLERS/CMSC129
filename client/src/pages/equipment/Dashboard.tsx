import React from "react";
import { Boxes, Package, Recycle, AlertTriangle } from "lucide-react";

import { logicEquipment } from "./logicEquipment";
import AddEquipmentDialog from "./AddEquipmentDialog";
import EquipmentTable from "./EquipmentTable";
import { CATEGORY_OPTIONS } from "./EquipmentForm";
import LoadingOverlay from "../../components/LoadingOverlay";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { Equipment } from "../../db";

const LOW_STOCK_THRESHOLD = 5;

export default function Dashboard() {
  const { equipmentList, handleAdd, handleEdit, handleDelete, handleArchive, handleRestore, handlePurge, isLoading } = logicEquipment();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "disposable" | "durable">("all");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [tab, setTab] = React.useState<"active" | "archived" | "purged">("active");
  const [purgedEquipment, setPurgedEquipment] = React.useState<Equipment[]>([]);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipment_purged"), (snapshot) => {
      const list: Equipment[] = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          equipmentID: doc.id,
          imageLink: data.imageLink,
          name: data.name,
          totalInventory: data.totalInventory,
          category: data.category,
          isDisposable: data.isDisposable,
          isDeleted: true,
          deletedAt: data.deletedAt,
          purgedAt: data.purgedAt,
        };
      });
      setPurgedEquipment(list);
    });
    return () => unsub();
  }, []);

  const categories = React.useMemo(() => {
    const baseCategories = CATEGORY_OPTIONS as readonly string[];
    const extraCategories = new Set<string>();
    let hasUncategorized = false;

    equipmentList.forEach((item) => {
      const label = item.category?.trim() || "Uncategorized";
      if (baseCategories.includes(label)) {
        return;
      }
      if (label === "Uncategorized") {
        hasUncategorized = true;
        return;
      }
      extraCategories.add(label);
    });

    return [
      ...baseCategories,
      ...Array.from(extraCategories).sort((a, b) => a.localeCompare(b)),
      ...(hasUncategorized ? ["Uncategorized"] : []),
    ];
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
    let baseList = equipmentList;
    if (tab === "active") {
      baseList = equipmentList.filter(item => !item.isDeleted);
    } else if (tab === "archived") {
      baseList = equipmentList.filter(item => item.isDeleted);
    } else {
      baseList = purgedEquipment;
    }
    const filtered = baseList.filter((item) => {
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

    const sorted = filtered.slice().sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      if (sortOrder === "asc") {
        return nameA.localeCompare(nameB);
      }
      return nameB.localeCompare(nameA);
    });

    return sorted;
  }, [equipmentList, purgedEquipment, searchTerm, categoryFilter, typeFilter, sortOrder, tab]);

  const filtersActive =
    searchTerm.trim().length > 0 || categoryFilter !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
  };

  return (
    <>
      <LoadingOverlay show={isLoading} message="Loading equipment inventory..." />
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
        <div className="card-body p-0">
          <div className="tabs tabs-boxed bg-base-300 p-2 flex flex-wrap">
            <button className={`tab transition-all duration-300 ease-in-out ${tab === "active" ? "tab-active bg-primary text-white font-semibold" : ""}`} onClick={() => setTab("active")}>Active</button>
            <button className={`tab transition-all duration-300 ease-in-out ${tab === "archived" ? "tab-active bg-primary text-white font-semibold" : ""}`} onClick={() => setTab("archived")}>Archived</button>
            <button className={`tab transition-all duration-300 ease-in-out ${tab === "purged" ? "tab-active bg-primary text-white font-semibold" : ""}`} onClick={() => setTab("purged")}>Purged</button>
          </div>
        </div>
        <div className="card-body space-y-4">
          {tab === "purged" && (
            <div className="alert alert-info">
              <span>Purged items are read-only history of equipment that was permanently removed.</span>
            </div>
          )}
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
              {tab === "purged"
                ? `Archived records available for purge: ${filteredEquipment.length}`
                : (
                  <>
                    Showing <span className="font-semibold">{filteredEquipment.length}</span> of{" "}
                    {equipmentList.length} records
                  </>
                )}
            </span>
            <span className="badge badge-outline">
              {stats.totalQuantity} total pieces • {stats.disposableCount} disposable
            </span>
          </div>

            <EquipmentTable
              equipmentList={filteredEquipment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onPurge={handlePurge}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              view={tab}
            />
        </div>
      </div>
    </div>
    </>
  );
}
