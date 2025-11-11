import { useEffect, useState } from "react"
import { EquipmentItem } from "@/type"
import { addEquipment, listenerEquipment, updateEquipment, deleteEquipment} from "@/equipment.query"


export function logicEquipment() {
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([])

  useEffect(() => {
    const unsubscribe = listenerEquipment(setEquipmentList)
    return () => unsubscribe()
  }, [])

  const handleAdd = async (equipment: Omit<EquipmentItem, "equipmentID">) => {
    await addEquipment(equipment)
  }

  const handleEdit = async (
    equipmentID: string,
    info: Partial<Omit<EquipmentItem, "equipmentID">>
  ) => {
    await updateEquipment(equipmentID, info)
  }

  const handleDelete = async (equipmentID: string) => {
    await deleteEquipment(equipmentID)
  }

  return { equipmentList, handleAdd, handleEdit, handleDelete }
}
