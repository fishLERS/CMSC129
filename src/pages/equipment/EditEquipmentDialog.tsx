import { useState, useEffect } from "react";
import EquipmentForm from "./EquipmentForm";
import { Equipment } from "../../db";

interface EditEquipmentDialogProps {
  item: Equipment;
  onEdit: (id: string, info: Partial<Omit<Equipment, "equipmentID">>) => void;
  renderTrigger?: (open: () => void) => React.ReactNode;
  openImmediately?: boolean;
  onClose?: () => void;
}

export default function EditEquipmentDialog({
  item,
  onEdit,
  renderTrigger,
  openImmediately,
  onClose,
}: EditEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(item);

  useEffect(() => {
    setForm(item);
  }, [item]);

  useEffect(() => {
    if (openImmediately) {
      setOpen(true);
    }
  }, [openImmediately]);

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

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const closeModal = () => {
    setOpen(false);
    onClose?.();
  };

  const handleEdit = async () => {
    try {
      const {
        equipmentID,
        name,
        totalInventory,
        category,
        isDisposable,
        imageLink,
      } = form;
      await onEdit(equipmentID!, {
        name,
        totalInventory,
        category,
        isDisposable,
        imageLink,
      });
      closeModal();
    } catch (err) {
      console.error("Failed to save equipment:", err);
    }
  };

  const openDialog = () => setOpen(true);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : !openImmediately ? (
        <button className="btn btn-xs btn-secondary" onClick={openDialog}>
          Edit
        </button>
      ) : null}

      {open && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Equipment</h3>

            <EquipmentForm form={form} onChange={handleChange} />

            <div className="modal-action">
              <button className="btn btn-primary" onClick={handleEdit}>
                Save
              </button>
              <button className="btn" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
