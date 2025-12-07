import EditEquipmentDialog from "./EditEquipmentDialog";
import { Equipment } from "../../db";

interface EquipmentTableProps {
  equipmentList: Equipment[];
  onEdit: (id: string, info: Partial<Omit<Equipment, "equipmentID">>) => void;
  onDelete: (id: string) => void;
}

const LOW_STOCK_THRESHOLD = 5;

export default function EquipmentTable({
  equipmentList,
  onEdit,
  onDelete,
}: EquipmentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
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
              <tr key={item.equipmentID} className="hover">
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
                  <div className="flex flex-wrap gap-2 justify-center">
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
    </div>
  );
}
