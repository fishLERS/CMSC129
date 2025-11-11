import { db } from "./firebase";
import { EquipmentItem } from "./type";
import { doc, collection, addDoc, getDocs, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const COLLECTION = "equipment";

//add equipment
export function addEquipment(equipment: Omit<EquipmentItem, "equipmentID">) {
  return addDoc(collection(db, COLLECTION), equipment);
}

//retrieve all equipment
// export async function displayAllEquipment(): Promise<EquipmentItem[]> {
//   const snapshot = await getDocs(collection(db, COLLECTION));
//   return snapshot.docs.map(doc => {
//     const data = doc.data();
//     return {
//       equipmentID: doc.id,
//       name: data.name as string,
//       quantity: data.quantity as number,
//       category: data.category as string | undefined,
//       status: data.status as string | undefined,
//       serial: data.serial as string | undefined,
//       notes: data.notes as string | undefined,
//     };
//   });
// }


//edit equipments
export function updateEquipment(
  equipmentID: string,
  info: Partial<Omit<EquipmentItem, "equipmentID">>
) {
  const equipmentData = doc(db, COLLECTION, equipmentID);
  return updateDoc(equipmentData, info);
}

//deleting equipments
export function deleteEquipment(equipmentID: string) {
  return deleteDoc(doc(db, COLLECTION, equipmentID));
}

//Equipment listener
export function listenerEquipment(callback: (items: EquipmentItem[]) => void) {
  return onSnapshot(collection(db, COLLECTION), (snapshot) => {
    const items: EquipmentItem[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
        equipmentID: doc.id,
        name: data.name as string,
        quantity: data.quantity as number,
        category: data.category as string | undefined,
        status: data.status as string | undefined,
        serial: data.serial as string | undefined,
        notes: data.notes as string | undefined,
    };
    });
    callback(items);
  });
}
