import { useState, useEffect } from "react";
import EquipmentForm from "./EquipmentForm";
import { Equipment } from "../../db";

interface EditEquipmentDialogProps {
  item: Equipment;
  onEdit: (id: string, info: Partial<Omit<Equipment, "equipmentID">>) => void;
}

export default function EditEquipmentDialog({ item, onEdit }: EditEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(item);

  useEffect(() => {
    setForm(item);
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target;

    let newValue: string | number | boolean = value;

    if (type === "number") {
      newValue = Number(value);
    } else if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }

    setForm({
      ...form,
      [name]: newValue,
    });
  };

  const handleEdit = async () => {
    try {
      const { equipmentID, ...updateData } = form;
      await onEdit(equipmentID!, updateData);
      setOpen(false);
    } catch (err) {
      console.error("Failed to save equipment:", err);
    }
  };

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        Edit
      </button>


      {open && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Equipment</h3>

            <EquipmentForm form={form} onChange={handleChange} />

            <div className="modal-action">
              <button className="btn btn-primary" onClick={handleEdit}>
                Save
              </button>
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
