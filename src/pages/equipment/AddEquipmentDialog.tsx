import { useState } from "react";
import { Equipment } from "../../db";
import EquipmentForm from "./EquipmentForm";

interface AddEquipmentDialogConfig {
  onAdd: (equipment: Omit<Equipment, "equipmentID">) => Promise<void>;
}

const initialForm: Omit<Equipment, "equipmentID"> = {
  name: "",
  totalInventory: 1,
  category: "",
  isDisposable: false,
  imageLink: "",
};

export default function AddEquipmentDialog({ onAdd }: AddEquipmentDialogConfig) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Equipment, "equipmentID">>(initialForm);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, type, value } = e.target;

    let newValue: string | number | boolean = value;

    if (type === "number") {
      newValue = Number(value);
    } else if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  }

  async function handleSubmit() {
    const isValid = form.name.trim() !== "" && form.totalInventory > 0;
    if (!isValid) {
      console.log("Invalid form");
      return;
    }

    try {
      await onAdd(form); // save to Firebase
      setForm(initialForm); // reset form
      setOpen(false); // close modal
    } catch (error) {
      console.error("Error saving equipment:", error);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        Add Equipment
      </button>

      {open && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add New Equipment</h3>

            <EquipmentForm form={form} onChange={handleChange} />

            <div className="modal-action">
              <button
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={!form.name.trim() || form.totalInventory <= 0}
              >
                Add
              </button>
              <button className="btn btn-error" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
