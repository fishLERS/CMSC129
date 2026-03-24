import { loadConfig } from '../config/env.js';
import { initializeFirebase } from '../config/firebase.js';
import { connectMongoDB } from '../config/mongodb.js';
import { getCollection } from '../services/fallbackService.js';
import { getFirestore } from '../config/firebase.js';

async function test() {
  const config = loadConfig();
  initializeFirebase(config);
  await connectMongoDB();

  const collections = ['users', 'equipment', 'requests'];

  for (const col of collections) {
    console.log(`\n🧪 Testing getCollection(${col})...`);

    let source = 'Firestore';
    try {
      const db = getFirestore();
      await db.collection(col).limit(1).get(); // probe Firestore
    } catch {
      source = 'MongoDB (fallback)';
    }

    const docs = await getCollection(col);
    console.log(`Result: got ${docs.length} ${col}`);
    console.log(`Source: ${source === 'Firestore' ? '🔥 ' : '🍃 '}${source} — ${docs.length > 0 ? '✅ got data' : '⚠️ empty'}`);
  }
}

test().catch(console.error);