import { useEquipment } from "@/logicEquipment";
import AddEquipmentDialog from "@/AddEquipmentDialog";
import EquipmentTable from "@/EquipmentTable";

export default function InventoryPage() {
  const { equipmentList, handleAdd, handleEdit, handleDelete } = useEquipment()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>
      <AddEquipmentDialog onAdd={handleAdd} />
      <EquipmentTable
        equipmentList={equipmentList}
        onUpdate={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
