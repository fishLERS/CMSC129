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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name } = target;

    let newValue: string | number | boolean = target.value;

    if (target instanceof HTMLInputElement) {
      if (target.type === "number") {
        newValue = Number(target.value);
      } else if (target.type === "checkbox") {
        newValue = target.checked;
      }
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
      <button className="btn btn-xs btn-secondary" onClick={() => setOpen(true)}>
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
