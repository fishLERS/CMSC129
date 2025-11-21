// src/pages/Dashboard.tsx
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { logicEquipment } from "./logicEquipment";
import AddEquipmentDialog from "./AddEquipmentDialog";
import EquipmentTable from "./EquipmentTable";

export default function Dashboard() {
  const { user } = useAuth();
  const { equipmentList, handleAdd, handleEdit, handleDelete } = logicEquipment()
  return (
    <>
    <div className="card">
      <div className="card-body space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <h2 className="card-title text-2xl">Equipment Inventory</h2>
          <AddEquipmentDialog onAdd={handleAdd} />
        </header>
        
        <EquipmentTable
          equipmentList={equipmentList}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>

    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">hi, {user?.displayName ?? user?.email}</h1>
      <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={() => signOut(auth)}>
        sign out
      </button>
    </div>
    </>
  );
}
