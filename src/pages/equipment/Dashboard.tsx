// src/pages/Dashboard.tsx
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from '../../adminSidebar'

import { logicEquipment } from "./logicEquipment";
import AddEquipmentDialog from "./AddEquipmentDialog";
import EquipmentTable from "./EquipmentTable";

export default function Dashboard() {
  const { user } = useAuth();
  const { equipmentList, handleAdd, handleEdit, handleDelete } = logicEquipment()
  return (
    <>
      <AdminSidebar />
      <div style={{ marginLeft: 'var(--sidebar-width)' }} className="min-h-screen p-6">
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

        {/* greeting and sign-out removed for admin inventory view */}
      </div>
    </>
  );
}
