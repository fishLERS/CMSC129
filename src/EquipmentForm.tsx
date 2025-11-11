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
      <Input name="name" value={form.name} onChange={onChange} placeholder="Name" />
      <Input
        name="quantity"
        type="number"
        value={form.quantity}
        onChange={onChange}
        placeholder="Quantity"
      />
      <Input name="category" value={form.category ?? ""} onChange={onChange} placeholder="Category" />
      <Input name="serial" value={form.serial ?? ""} onChange={onChange} placeholder="Serial" />
      <Textarea name="notes" value={form.notes ?? ""} onChange={onChange} placeholder="Notes" />
    </div>
  )
}