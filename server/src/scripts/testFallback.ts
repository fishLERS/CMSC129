import { loadConfig } from '../config/env.js';
import { initializeFirebase } from '../config/firebase.js';
import { connectMongoDB } from '../config/mongodb.js';
import { getCollection, getDocument } from '../services/fallbackService.js';

async function test() {
  const config = loadConfig();
  initializeFirebase(config);
  await connectMongoDB();

  console.log('\n🧪 Testing getCollection(users)...');
  const users = await getCollection('users');
  console.log(`Result: got ${users.length} users`);
  console.log('Source: Firestore or MongoDB?', users.length > 0 ? '✅ got data' : '❌ empty');
}

test().catch(console.error);