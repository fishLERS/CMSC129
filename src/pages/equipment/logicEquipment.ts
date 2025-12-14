import { useEffect, useState } from "react"
import { Equipment, AvailableEquipmentItem} from "../../db"
import { addEquipment, listenerEquipment, updateEquipment, deleteEquipment } from "./query"


export function logicEquipment() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = listenerEquipment((items) => {
      setEquipmentList(items)
      setIsLoading(false)
    })
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

  return { equipmentList, handleAdd, handleEdit, handleDelete, isLoading }
}

/**
 * Basic availability hook used by the request form. For now we treat every item
 * as fully available (no reservations), but keep the structure ready for when
 * reservation overlap logic is implemented.
 */
export function useFetchAvailableItems(
  equipmentList: Equipment[],
  _startDate?: string,
  _endDate?: string
) {
  const [availableEquipment, setAvailableEquipment] = useState<AvailableEquipmentItem[]>([])

  useEffect(() => {
    const withAvailability: AvailableEquipmentItem[] = (equipmentList || []).map((item) => {
      const total = item.totalInventory || 0
      return {
        ...item,
        available: total,
        reserved: 0,
        isAvailable: total > 0,
      }
    })
    setAvailableEquipment(withAvailability)
  }, [equipmentList, _startDate, _endDate])

  return {
    availableEquipment,
    isFetching: false,
  }
}
