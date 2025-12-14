import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { Equipment, AvailableEquipmentItem} from "../../db"
import { db } from "../../firebase"
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
  const [activeReservations, setActiveReservations] = useState<Record<string, number>>({})

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "requests"), (snapshot) => {
      const reservedTotals: Record<string, number> = {}
      snapshot.forEach((doc) => {
        const data = doc.data() as any
        const status = (data.status || "").toString().toLowerCase()
        // count only requests awaiting approval
        if (status !== "pending" && status !== "ongoing") return
        const items = Array.isArray(data.items) ? data.items : []
        items.forEach((item: any) => {
          const equipmentID = item?.equipmentID
          const qty = Number(item?.qty) || 0
          if (!equipmentID || qty <= 0) return
          reservedTotals[equipmentID] = (reservedTotals[equipmentID] || 0) + qty
        })
      })
      setActiveReservations(reservedTotals)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const withAvailability: AvailableEquipmentItem[] = (equipmentList || []).map((item) => {
      const total = item.totalInventory || 0
      const reserved = activeReservations[item.equipmentID || ""] || 0
      const remaining = Math.max(total - reserved, 0)
      return {
        ...item,
        available: remaining,
        reserved,
        isAvailable: remaining > 0,
      }
    })
    setAvailableEquipment(withAvailability)
  }, [equipmentList, activeReservations, _startDate, _endDate])

  return {
    availableEquipment,
    isFetching: false,
  }
}
