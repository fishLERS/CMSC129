import { Equipment, Category } from "../../db";

interface EquipmentFormProps {
  form: Omit<Equipment, "equipmentID">;
  categories: Category[]; // Dynamic categories from DB
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function EquipmentForm({ form, categories, onChange }: EquipmentFormProps) {
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
          className="input input-bordered w-full"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoryID" className="text-sm font-medium">Category</label>
        <select
          id="categoryID"
          name="categoryID"
          value={form.categoryID || ""}
          onChange={onChange}
          className="select select-bordered w-full"
        >
          <option value="" disabled>Select a category</option>
          {categories.map((cat) => (
            <option key={cat.categoryID} value={cat.categoryID}>
              {cat.name}
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