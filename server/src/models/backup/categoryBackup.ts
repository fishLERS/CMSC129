import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryBackup extends Document {
    docId: string;      // The Firestore Document ID
    name: string;
    description?: string;
    createdAt?: string;
}

const CategoryBackupSchema: Schema = new Schema(
    {
        docId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        createdAt: { type: String },
    },
    {
        timestamps: true, // Internal MongoDB tracking
        collection: 'categories_backup'
    }
);

export const CategoryBackup = mongoose.model<ICategoryBackup>(
    'CategoryBackup',
    CategoryBackupSchema
);