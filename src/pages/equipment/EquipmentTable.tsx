import React from "react";
import EditEquipmentDialog from "./EditEquipmentDialog";
import { Equipment } from "../../db";

interface EquipmentTableProps {
  equipmentList: Equipment[];
  onEdit: (id: string, info: Partial<Omit<Equipment, "equipmentID">>) => void;
  onDelete: (id: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
}

const LOW_STOCK_THRESHOLD = 5;

export default function EquipmentTable({
  equipmentList,
  onEdit,
  onDelete,
  sortOrder,
  onSortOrderChange,
}: EquipmentTableProps) {
  const [selectedItem, setSelectedItem] = React.useState<Equipment | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const openDetails = (item: Equipment) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeDetails = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
        <div className="form-control w-full sm:w-60">
          <label className="label py-1">
            <span className="label-text text-sm font-medium">Sort alphabetically</span>
          </label>
          <select
            className="select select-bordered select-sm"
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as "asc" | "desc")}
          >
            <option value="asc">A → Z (Ascending)</option>
            <option value="desc">Z → A (Descending)</option>
          </select>
        </div>
      </div>
      <table className="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Category</th>
            <th>Disposable</th>
            <th>Image</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {equipmentList.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-base-content/60">
                No equipment found
              </td>
            </tr>
          ) : (
            equipmentList.map((item) => (
              <tr
                key={item.equipmentID}
                className="transition-colors hover:bg-primary/10 cursor-pointer"
                onClick={() => openDetails(item)}
              >
                <td>
                  <div className="font-semibold">{item.name}</div>
                  {item.equipmentID && (
                    <div className="text-xs text-base-content/60">ID: {item.equipmentID}</div>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.totalInventory ?? 0}</span>
                    {(item.totalInventory ?? 0) <= LOW_STOCK_THRESHOLD && (
                      <span className="badge badge-warning badge-sm">Low</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="badge badge-outline">
                    {item.category?.trim() || "Uncategorized"}
                  </span>
                </td>
                <td>
                  {item.isDisposable ? (
                    <span className="badge badge-success">Disposable</span>
                  ) : (
                    <span className="badge badge-neutral">Durable</span>
                  )}
                </td>
                <td>
                  {item.imageLink ? (
                    <img
                      src={item.imageLink}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <span className="text-base-content/60">No image</span>
                  )}
                </td>
                <td className="justify-center items-center gap-2">
                  <div
                    className="flex flex-wrap gap-2 justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EditEquipmentDialog item={item} onEdit={onEdit} />
                    <button
                      className="btn btn-xs btn-error"
                      onClick={() => onDelete(item.equipmentID!)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {isModalOpen && selectedItem && (
        <div
          className="modal modal-open modal-bottom sm:modal-middle"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetails();
          }}
        >
          <div className="modal-box w-full max-w-2xl p-6">
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              onClick={(e) => {
                e.stopPropagation();
                closeDetails();
              }}
            >
              X
            </button>
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm text-base-content/60">Equipment</p>
                <h3 className="text-2xl font-bold leading-tight">{selectedItem.name}</h3>
                {selectedItem.equipmentID && (
                  <p className="text-sm text-base-content/60 mt-1">
                    ID: {selectedItem.equipmentID}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-base-200 rounded-xl p-4 flex items-center justify-center">
                  {selectedItem.imageLink ? (
                    <img
                      src={selectedItem.imageLink}
                      alt={selectedItem.name}
                      className="w-full max-h-96 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-base-content/60 text-center py-16">No image available</div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-base-content/60 uppercase tracking-wide">Category</p>
                      <p className="text-lg font-semibold">
                        {selectedItem.category?.trim() || "Uncategorized"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60 uppercase tracking-wide">Type</p>
                      <p className="text-lg font-semibold">
                        {selectedItem.isDisposable ? "Disposable" : "Durable"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60 uppercase tracking-wide">Quantity</p>
                      <p className="text-lg font-semibold">{selectedItem.totalInventory ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60 uppercase tracking-wide">Status</p>
                      <p className="text-lg font-semibold">
                        {(selectedItem.totalInventory ?? 0) <= LOW_STOCK_THRESHOLD ? "Low Stock" : "In Stock"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-outline">
                      {selectedItem.isDisposable ? "Single-use" : "Reusable"}
                    </span>
                    {(selectedItem.totalInventory ?? 0) <= LOW_STOCK_THRESHOLD && (
                      <span className="badge badge-warning">Needs restock</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={closeDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
