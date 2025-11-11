import React, { useEffect, useState } from "react";
import { EquipmentItem } from "./type"; // your interface
import {
  addEquipment,
  listenerEquipment,
  updateEquipment,
  deleteEquipment,
} from "./equipment.query";

const InventoryPage: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    quantity: 0,
    category: "",
    status: "",
    serial: "",
    notes: "",
  });

  // Real-time listener
  useEffect(() => {
    const unsubscribe = listenerEquipment(setEquipmentList);
    return () => unsubscribe();
  }, []);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setNewEquipment({ ...newEquipment, [e.target.name]: e.target.value });
  };

  // Add equipment
  const handleAdd = async () => {
    if (!newEquipment.name || newEquipment.quantity <= 0) return;
    await addEquipment(newEquipment);
    setNewEquipment({
      name: "",
      quantity: 0,
      category: "",
      status: "",
      serial: "",
      notes: "",
    });
  };

  // Delete equipment
  const handleDelete = async (equipmentID: string) => {
    await deleteEquipment(equipmentID);
  };

  // Update equipment (example: toggle status)
  const handleToggleStatus = async (item: EquipmentItem) => {
    await updateEquipment(item.equipmentID, {
      status: item.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>

      {/* Add Equipment Form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          name="name"
          placeholder="Equipment Name"
          value={newEquipment.name}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={newEquipment.quantity}
          onChange={handleChange}
          className="border p-2 rounded w-24"
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={newEquipment.category}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white px-4 rounded"
        >
          Add
        </button>
      </div>

      {/* Equipment Table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Quantity</th>
            <th className="border px-2 py-1">Category</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Serial</th>
            <th className="border px-2 py-1">Notes</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {equipmentList.map((item) => (
            <tr key={item.equipmentID}>
              <td className="border px-2 py-1">{item.name}</td>
              <td className="border px-2 py-1">{item.quantity}</td>
              <td className="border px-2 py-1">{item.category}</td>
              <td className="border px-2 py-1">{item.status}</td>
              <td className="border px-2 py-1">{item.serial}</td>
              <td className="border px-2 py-1">{item.notes}</td>
              <td className="border px-2 py-1 flex gap-2">
                <button
                  onClick={() => handleToggleStatus(item)}
                  className="bg-green-500 text-white px-2 rounded"
                >
                  Toggle Status
                </button>
                <button
                  onClick={() => handleDelete(item.equipmentID)}
                  className="bg-red-500 text-white px-2 rounded"
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
};

export default InventoryPage;
