import { getFirestore } from '../config/firebase.js';
import { UserBackup } from '../models/backup/userBackup.js';
import { EquipmentBackup } from '../models/backup/equipmentBackup.js';
import { RequestBackup } from '../models/backup/requestBackup.js';
import mongoose from 'mongoose'; 

const listeners: Array<{ collection: string; model: mongoose.Model<any> }> = [ 
  { collection: 'users',     model: UserBackup },
  { collection: 'equipment', model: EquipmentBackup },
  { collection: 'requests',  model: RequestBackup },
];

export const startFirestoreListeners = (): void => {
  const db = getFirestore();

  for (const { collection, model } of listeners) {
    db.collection(collection).onSnapshot(
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const docId = change.doc.id;
          const data  = change.doc.data();

          try {
            if (change.type === 'added' || change.type === 'modified') {
              await model.findOneAndUpdate(
                { docId },
                { docId, ...data },
                { upsert: true, new: true }
              );
              console.log(`🔄 Backed up ${collection}/${docId}`);
            }

            if (change.type === 'removed') {
              await model.deleteOne({ docId });
              console.log(`🗑️ Removed backup ${collection}/${docId}`);
            }
          } catch (err) {
            console.error(`❌ Error backing up ${collection}/${docId}:`, err);
          }
        }
      },
      (err) => {
        console.error(`❌ Firestore listener error on ${collection}:`, err);
      }
    );

    console.log(`👂 Listening to Firestore collection: ${collection}`);
  }
};