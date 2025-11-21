import { useState } from "react"
import { Button } from "@/components/ui/button"
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog"
import { EquipmentItem } from "@/type"
import EquipmentForm from "@/EquipmentForm"

interface AddEquipmentDialogConfig {
  onAdd: (equipment: Omit<EquipmentItem, "equipmentID">) => Promise<void>
}

const initialForm: Omit<EquipmentItem, "equipmentID"> = {
  name: "",
  quantity: 1,
  category: "",
  status: "",
  serial: "",
  notes: "",
}

export default function AddEquipmentDialog({ onAdd }: AddEquipmentDialogConfig) {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<Omit<EquipmentItem, "equipmentID">>(initialForm)
    
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const { name, value } = e.target
        
        let newValue: string | number
    
        if (name === "quantity") {
            newValue = Number(value)
        } else {
            newValue = value
        }
    
        setForm(function (prev) {        
            return { ...prev, [name]: newValue,}
        })
    }

    async function handleSubmit() {
        const isValid = form.name.trim() !== "" && form.quantity > 0
        if (isValid) {
            try {
                await onAdd(form)          //save to firebase
                setForm(initialForm)       //reset form
                setOpen(false)             //close dialog
                } catch (error) {
                    console.error("Error saving equipment:", error) //todo: show error feedback
                }
        } else {
            console.log("Invalid form")     //todo: show error feedback
            return
        }
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
                <Button className = "bg-blue-500 text-white px-4 py-2 rounded" onClick={handleSubmit} disabled={!form.name.trim() || form.quantity <= 0}>
                Add
                </Button>
                <Button variant="destructive" onClick={() => setOpen(false)}>
                Cancel
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}