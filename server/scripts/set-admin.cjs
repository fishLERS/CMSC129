#!/usr/bin/env node
/**
 * Set admin claim for a user
 * Usage: node set-admin.cjs <uid>
 * 
 * Example: node set-admin.cjs abc123xyz
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error loading service account key');
  console.error('Make sure firebase-service-account.json exists in the server directory');
  process.exit(1);
}

const auth = admin.auth();

async function setAdminClaim(uid) {
  try {
    if (!uid) {
      console.error('❌ Usage: node set-admin.cjs <uid>');
      console.error('Example: node set-admin.cjs abc123xyz');
      process.exit(1);
    }

    console.log(`⏳ Setting admin claim for user: ${uid}`);
    
    // Set custom claims
    await auth.setCustomUserClaims(uid, { admin: true });
    
    console.log('✅ Admin claim set successfully!');
    console.log(`User ${uid} is now an admin.`);
    
    // Get user to verify
    const user = await auth.getUser(uid);
    console.log(`\n📋 User Details:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName || 'Not set'}`);
    console.log(`   Admin: true`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin claim:');
    console.error(error.message);
    process.exit(1);
  }
}

// Get UID from command line
const uid = process.argv[2];
setAdminClaim(uid);
