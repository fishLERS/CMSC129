import { db } from "../../firebase";
import { Equipment} from "../../db";
import { doc, collection, addDoc, updateDoc, deleteDoc,
          onSnapshot, query, where, getDocs, Firestore } from "firebase/firestore";

const COLLECTION = "equipment";

//add equipment
export function addEquipment(equipment: Omit<Equipment, "equipmentID">) {
  return addDoc(collection(db, COLLECTION), equipment);
}

//edit equipments
export function updateEquipment(
  equipmentID: string,
  info: Partial<Omit<Equipment, "equipmentID">>
) {
  const equipmentData = doc(db, COLLECTION, equipmentID);
  return updateDoc(equipmentData, info);
}

//deleting equipments
export function deleteEquipment(equipmentID: string) {
  return deleteDoc(doc(db, COLLECTION, equipmentID));
}

//Equipment listener
export function listenerEquipment(callback: (items: Equipment[]) => void) {
  return onSnapshot(collection(db, COLLECTION), (snapshot) => {
    const items: Equipment[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
        equipmentID: doc.id,
        imageLink: data.imageLink as string | undefined,
        name: data.name as string,
        totalInventory: data.totalInventory as number,
        category: data.category as string | undefined,
        isDisposable: data.isDisposable as boolean, 
      };
    });
    callback(items);
  });
}

//retrieve approved equipments on certain durations

export const getReservedEquipments = async (Request_start: string, Request_end: string): Promise<{[equipmentID: string]: number}> => {
  const q = query(
    collection(db, "requests"),
    where("status", "in", ["approved"]),
    where("startDate", "<=", Request_end) 
    );

    try {
      const snapshot = await getDocs(q);
      const reservedItems: {[equipmentID: string]: number} = {};

      snapshot.forEach((doc) => {
        const request = doc.data() as any; 

        if (request.endDate >= Request_start) {
                
          request.items.forEach((item: { equipmentID: string, qty: number }) => {
          const id = item.equipmentID;
          reservedItems[id] = (reservedItems[id] || 0) + item.qty;
          });
        }
      });

    console.log("Reserved result:", reservedItems);

    return reservedItems;

    } catch (error) {
        console.error("Error fetching reserved equipment:", error);
      return {}; 
    }
};