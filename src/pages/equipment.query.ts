import { db } from "../firebase"; //firebase configuration with export database
import { Equipment, EquipmentIssue  } from "../db"; //table name + type (str, num, array)

//firestore features
import {
  doc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,  
} from "firebase/firestore";


//firestore collection
const COLLECTION = "equipment";


//for adding equipment
export function addEquipment(equipment: Omit<EquipmentItem, "id">) {
	return addDoc(collection(db, COLLECTION), equipment);
}

//for retrieving equipment list
export function displayAllEquipment() {
	return getDocs(collection(db, COLLECTION));
}

//for updating equipment
export function updateEquipment (
	id: string,
	info: Partial<Omit<EquipmentItem, "id">>
) {
	const equipmentData = doc(db, COLLECTION, id);
	return updateDoc(equipmentData, info);
}

//for deleting equipment
export function deleteEquipment(id: string) {
	return deleteDoc(doc(db, COLLECTION, id));
}

//Equipment listener
export function listenerEquipment(callback: (items: EquipmentItem[]) => void) {
  return onSnapshot(collection(db, COLLECTION), (snapshot) => {
    const items: EquipmentItem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EquipmentItem[];
    callback(items);
  });
}