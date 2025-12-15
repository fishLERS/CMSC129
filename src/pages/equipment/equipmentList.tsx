import { Equipment } from "../../db";

interface EquipmentListProps {
  items: Equipment[];
  onUpdate: (id: string, info: Partial<Omit<Equipment, "equipmentID">>) => void;
  onDelete: (id: string) => void;
}

export function EquipmentList({ items, onUpdate, onDelete }: EquipmentListProps) {
  return (
    <div className="space-y-3 mt-6">
      {items.map((item) => (
        <div
          key={item.equipmentID}
          className="flex justify-between items-center border p-3 rounded-md"
        >
          <div>
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-gray-500">
              Qty: {item.totalInventory}
            </p>
            {item.category && (
              <p className="text-sm">Category: {item.category}</p>
            )}
            {item.imageLink && (
              <img
                src={item.imageLink}
                alt={item.name}
                className="w-12 h-12 object-cover rounded mt-2"
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() =>
                onUpdate(item.equipmentID!, { isDisposable: !item.isDisposable })
              }
            >
              Toggle Disposable
            </button>
            <button
              className="btn btn-error"
              onClick={() => onDelete(item.equipmentID!)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
