import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog"
import EquipmentForm from "@/EquipmentForm"
import { EquipmentItem } from "@/type"

interface EditEquipmentDialogProps {
  item: EquipmentItem
  onEdit: (id: string, info: Partial<Omit<EquipmentItem, "equipmentID">>) => void
}

export default function EditEquipmentDialog({ item, onEdit }: EditEquipmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(item) 
  
  useEffect(() => { setForm(item)}, [item])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

const handleEdit = async () => {
  try {
    if (typeof onEdit !== "function") {
      console.error("onEdit is not a function", onEdit)
      return
    }

    const { equipmentID, ...updateData } = form
    updateData.quantity = Number(updateData.quantity)

    await onEdit(item.equipmentID, updateData)
    setOpen(false)
  } catch (err) {
    console.error("Failed to save equipment:", err)
  }
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
        </DialogHeader>
        <EquipmentForm form={form} onChange={handleChange} />
        <DialogFooter>
          <Button className = "bg-blue-500 text-white px-4 py-2 rounded" onClick={handleEdit}>Save</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}