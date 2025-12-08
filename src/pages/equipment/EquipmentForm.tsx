import { Equipment } from "../../db";

export const CATEGORY_OPTIONS = [
  "Supplies and Chemistry",
  "Live Specimen",
  "Instruments",
  "Rearing Units",
] as const;
export type CategoryOption = typeof CATEGORY_OPTIONS[number];

interface EquipmentFormProps {
  form: Omit<Equipment, "equipmentID">;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function EquipmentForm({ form, onChange }: EquipmentFormProps) {
  const categoryValue: CategoryOption =
    CATEGORY_OPTIONS.find((option) => option === form.category) ?? CATEGORY_OPTIONS[0];

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
        <label htmlFor="totalInventory" className="text-sm font-medium">Quantity</label>
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
        <select
          id="category"
          name="category"
          value={categoryValue}
          onChange={onChange}
          className="select select-bordered w-full"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
