import { logicEquipment } from "@/logicEquipment";
import AddEquipmentDialog from "@/AddEquipmentDialog";
import EquipmentTable from "@/EquipmentTable";

export default function InventoryPage() {
  const { equipmentList, handleAdd, handleEdit, handleDelete } = logicEquipment()
  
  return (
  <div className="min-h-screen bg-background p-4 sm:p-8 lg:p-20">
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Equipment Inventory
        </h1>
        <div className="mt-4 sm:mt-0">
          <AddEquipmentDialog onAdd={handleAdd} />
        </div>
      </header>

    
      <EquipmentTable
        equipmentList={equipmentList}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  </div>
  )
}
