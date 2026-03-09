#!/usr/bin/env node
/**
 * Set admin claim for a user
 * Usage:
 *   node set-admin.cjs <uid> [admin|super]
 *
 * Examples:
 *   node set-admin.cjs abc123xyz admin
 *   node set-admin.cjs abc123xyz super
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
  console.error('Error loading service account key');
  console.error('Make sure firebase-service-account.json exists in the server directory');
  process.exit(1);
}

const auth = admin.auth();

async function setAdminClaim(uid, level = 'admin') {
  try {
    if (!uid) {
      console.error('Usage: node set-admin.cjs <uid> [admin|super]');
      console.error('Example: node set-admin.cjs abc123xyz super');
      process.exit(1);
    }

    const normalizedLevel = String(level).toLowerCase();
    if (!['admin', 'super'].includes(normalizedLevel)) {
      console.error('Invalid level. Use "admin" or "super".');
      process.exit(1);
    }

    const isSuperAdmin = normalizedLevel === 'super';
    console.log(`Setting ${isSuperAdmin ? 'super admin' : 'admin'} claim for user: ${uid}`);

    await auth.setCustomUserClaims(uid, {
      admin: true,
      superAdmin: isSuperAdmin,
    });

    console.log('Admin claim set successfully');
    console.log(`User ${uid} is now ${isSuperAdmin ? 'a super admin' : 'an admin'}.`);

    const user = await auth.getUser(uid);
    console.log('\nUser Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName || 'Not set'}`);
    console.log(`   Admin: ${!!user.customClaims?.admin}`);
    console.log(`   Super Admin: ${!!user.customClaims?.superAdmin}`);

    process.exit(0);
  } catch (error) {
    console.error('Error setting admin claim:');
    console.error(error.message);
    process.exit(1);
  }
}

const uid = process.argv[2];
const level = process.argv[3] || 'admin';
setAdminClaim(uid, level);
