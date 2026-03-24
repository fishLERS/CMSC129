import mongoose from 'mongoose';
import { loadConfig } from './env';

let isConnected = false;

export const connectMongoDB = async (): Promise<void> => {
  if (isConnected) return;
  
  const config = loadConfig();
  
  try {
    await mongoose.connect(config.mongodbUri);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
};