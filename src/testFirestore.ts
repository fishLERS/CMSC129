// src/testFirestore.ts
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

async function testFirestore() {
  const colRef = collection(db, "test");
  await addDoc(colRef, { name: "Hello Emulator" });
  const snapshot = await getDocs(colRef);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
}

testFirestore();
