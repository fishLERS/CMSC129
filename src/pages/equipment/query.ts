import { db } from "../../firebase";
import { Equipment} from "../../db";
import { doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs, Firestore } from "firebase/firestore";

const COLLECTION = "equipment";

function generateSerialNumbers(
  equipmentID: string | undefined,
  name: string | undefined,
  totalInventory: number | undefined,
  isDisposable: boolean | undefined
) {
  if (isDisposable || !totalInventory || totalInventory <= 0) return [];
  const base = (equipmentID || name || "ITEM").toString();
  const prefix = base.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "ITEM";
  return Array.from({ length: totalInventory }, (_, idx) => `${prefix}-${String(idx + 1).padStart(3, "0")}`);
}

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
        isDeleted: data.isDeleted as boolean | undefined,
        deletedAt: data.deletedAt as string | undefined,
        serialNumbers: generateSerialNumbers(doc.id, data.name as string | undefined, data.totalInventory as number | undefined, data.isDisposable as boolean | undefined),
      };
    });
    callback(items);
  });
}
