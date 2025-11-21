import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EquipmentItem } from "@/type"

interface EquipmentFormProps {
  form: Omit<EquipmentItem, "equipmentID">
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export default function EquipmentForm({ form, onChange }: EquipmentFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">Name</label>
        <Input
          id="name"
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Name"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity</label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          value={form.quantity}
          onChange={onChange}
          placeholder="Quantity"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-gray-700">Category</label>
        <Input
          id="category"
          name="category"
          value={form.category ?? ""}
          onChange={onChange}
          placeholder="Category"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="serial" className="text-sm font-medium text-gray-700">Serial</label>
        <Input
          id="serial"
          name="serial"
          value={form.serial ?? ""}
          onChange={onChange}
          placeholder="Serial"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes</label>
        <Textarea
          id="notes"
          name="notes"
          value={form.notes ?? ""}
          onChange={onChange}
          placeholder="Notes"
        />
      </div>
    </div>
  )
}
