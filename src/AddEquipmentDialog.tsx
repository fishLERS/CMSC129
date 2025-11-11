import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import EquipmentForm from "./EquipmentForm"

interface AddEquipmentDialogProps {
  onAdd: (equipment: {
    name: string
    quantity: number
    category?: string
    status?: string
    serial?: string
    notes?: string
  }) => void
}

export default function AddEquipmentDialog({ onAdd }: AddEquipmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    quantity: 0,
    category: "",
    status: "",
    serial: "",
    notes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = () => {
    if (!form.name || form.quantity <= 0) return
    onAdd(form)
    setForm({ name: "", quantity: 0, category: "", status: "", serial: "", notes: "" })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Equipment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
        </DialogHeader>
        <EquipmentForm form={form} onChange={handleChange} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
