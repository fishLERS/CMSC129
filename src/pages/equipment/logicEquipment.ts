import { useEffect, useState, useMemo } from "react"
import { Equipment, AvailableEquipmentItem} from "../../db"
import { addEquipment, listenerEquipment, updateEquipment, deleteEquipment, getReservedEquipments} from "./query"


export function logicEquipment() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])

  useEffect(() => {
    const unsubscribe = listenerEquipment(setEquipmentList)
    return () => unsubscribe()
  }, [])

  const handleAdd = async (equipment: Omit<Equipment, "equipmentID">) => {
    await addEquipment(equipment)
  }

  const handleEdit = async (
    equipmentID: string,
    info: Partial<Omit<Equipment, "equipmentID">>
  ) => {
    await updateEquipment(equipmentID, info)
  }

  const handleDelete = async (equipmentID: string) => {
    await deleteEquipment(equipmentID)
  }

  return { equipmentList, handleAdd, handleEdit, handleDelete }
}
