import EditEquipmentDialog from "./EditEquipmentDialog";
import { Equipment } from "../../db";

interface EquipmentTableProps {
  equipmentList: Equipment[];
  onEdit: (id: string, info: Partial<Omit<Equipment, "equipmentID">>) => void;
  onDelete: (id: string) => void;
}

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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {equipmentList.map((item) => (
            <tr key={item.equipmentID}>
              <td>{item.name}</td>
              <td>{item.totalInventory}</td>
              <td>{item.category}</td>
              <td>
                {item.isDisposable ? (
                  <span className="badge badge-success">Yes</span>
                ) : (
                  <span className="badge badge-neutral">No</span>
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
              <td className="flex gap-2 justify-center items-center align-middle">
                <EditEquipmentDialog item={item} onEdit={onEdit} />
                <button
                  className="btn btn-xs btn-error"
                  onClick={() => onDelete(item.equipmentID!)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}