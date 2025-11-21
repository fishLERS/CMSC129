import { Equipment } from "../../db";

interface EquipmentFormProps {
  form: Omit<Equipment, "equipmentID">;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function EquipmentForm({ form, onChange }: EquipmentFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={onChange}
          placeholder="Equipment name"
          className="input input-bordered w-full"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="totalInventory" className="text-sm font-medium">Inventory</label>
        <input
          id="totalInventory"
          name="totalInventory"
          type="number"
          value={form.totalInventory}
          onChange={onChange}
          placeholder="Total inventory"
          className="input input-bordered w-full"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">Category</label>
        <input
          id="category"
          name="category"
          type="text"
          value={form.category ?? ""}
          onChange={onChange}
          placeholder="Category"
          className="input input-bordered w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isDisposable"
          name="isDisposable"
          type="checkbox"
          checked={form.isDisposable}
          onChange={onChange}
          className="checkbox"
        />
        <label htmlFor="isDisposable" className="text-sm font-medium">Disposable</label>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="imageLink" className="text-sm font-medium">Image Link</label>
        <input
          id="imageLink"
          name="imageLink"
          type="text"
          value={form.imageLink ?? ""}
          onChange={onChange}
          placeholder="https://link.com/image.png"
          className="input input-bordered w-full"
        />
      </div>
    </div>
  );
}
