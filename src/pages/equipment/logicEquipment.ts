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

interface AvailableItems {
  availableEquipment: AvailableEquipmentItem[];
  isFetching: boolean;
}

export function useFetchAvailableItems(
  equipmentList: Equipment[], 
  StartDate: string,
  EndDate: string
): AvailableItems {
  const [reservedQuantities, setReservedQuantities] = useState<{[id: string]: number}>({});
  const [isFetching, setIsFetching] = useState(false);
  
  useEffect(() => {
    if (!StartDate || !EndDate || equipmentList.length === 0) {
      setReservedQuantities({});
      return;
    }
    
    const fetchCommitments = async () => {
      setIsFetching(true);
      
      try {
        const commitments = await getReservedEquipments(StartDate, EndDate);
        console.log("FETCH SUCCESS: Reserved Quantities:", commitments);
        setReservedQuantities(commitments);
      } catch (error) {
        console.error("Failed to fetch commitments:", error);
        setReservedQuantities({});
      } finally {
        setIsFetching(false);
      }
    };
    fetchCommitments();
  }, [StartDate, EndDate, equipmentList.length]);


    //solve the available list 
    const availableEquipment: AvailableEquipmentItem[] = useMemo(() => {
      if (isFetching) {
        console.log("STATUS: Fetching... returning initial inventory.");
        return equipmentList.map((item: Equipment) => ({ 
             ...item,
             available: item.totalInventory,
             reserved: 0,
             isAvailable: item.totalInventory > 0
            }) as AvailableEquipmentItem);
          }
          return equipmentList.map((item: Equipment) => { 
            const reserved = reservedQuantities[item.equipmentID!] || 0;
            const available = Math.max(0, item.totalInventory - reserved);

            if (item.equipmentID && reserved > 0) {
            console.log(`CALCULATION for ${item.name} (${item.equipmentID!}) - Total: ${item.totalInventory}, Reserved: ${reserved}, Available: ${available}`);
          }
            
            return {
              ...item,
              available: available,
              reserved: reserved,
              isAvailable: available > 0
            } as AvailableEquipmentItem;
          });
}, [equipmentList, reservedQuantities, isFetching]);
  return { availableEquipment, isFetching };
}