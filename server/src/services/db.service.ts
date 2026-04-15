// src/services/db.service.ts
import { getFirestore } from '../config/firebase.js';
import { UserBackup } from '../models/backup/userBackup.js';
import { EquipmentBackup } from '../models/backup/equipmentBackup.js';
import { RequestBackup } from '../models/backup/requestBackup.js';
import { CategoryBackup } from '../models/backup/categoryBackup.js'; 
import mongoose from 'mongoose';

/**
 * Model Map connects Firestore collection names to Mongoose Backup models.
 */
const modelMap: Record<string, mongoose.Model<any>> = {
    users: UserBackup,
    equipment: EquipmentBackup,
    requests: RequestBackup,
    categories: CategoryBackup,
    purged_equipment: EquipmentBackup, // Assuming purged items stay in the same schema
};

/**
 * Utility to check if MongoDB is actually connected before attempting failover.
 */
const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * READ COLLECTION (Failover-Safe)
 * Primary: Firestore | Fallback: MongoDB
 */
export const getCollection = async (collectionName: string): Promise<any[]> => {

    throw new Error("SIMULATED_FIREBASE_DOWN");
    
    try {
        const db = getFirestore();
        const snapshot = await db.collection(collectionName).get();

        // Success: Return Firestore data
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
        console.warn(`⚠️ Firestore Failover [Collection: ${collectionName}]: ${error.message}`);

        if (!isMongoConnected()) {
            console.error("❌ Critical: MongoDB backup is also disconnected.");
            throw new Error("All database nodes are unavailable.");
        }

        const model = modelMap[collectionName];
        if (!model) {
            console.error(`❌ No backup model defined for collection: ${collectionName}`);
            return [];
        }

        const backups = await model.find().lean();
        return backups.map(doc => ({
            ...doc,
            id: doc.docId || doc._id.toString()
        }));
    }
};

/**
 * READ DOCUMENT (Failover-Safe)
 * Primary: Firestore | Fallback: MongoDB
 */
export const getDocument = async (collectionName: string, docId: string): Promise<any | null> => {
    try {
        const db = getFirestore();
        const doc = await db.collection(collectionName).doc(docId).get();

        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error: any) {
        console.warn(`⚠️ Firestore Failover [Document: ${collectionName}/${docId}]: ${error.message}`);

        if (!isMongoConnected()) return null;

        const model = modelMap[collectionName];
        if (!model) return null;

        // In MongoDB, we store the original Firestore ID as 'docId'
        const backup = await model.findOne({ docId }).lean();

        if (backup) {
            return { ...backup, id: backup.docId };
        }
        return null;
    }
};