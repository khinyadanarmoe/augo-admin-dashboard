
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Automated Migration Script for Existing Announcers
 * 
 * This script:
 * 1. Reads all announcers from Firestore
 * 2. Creates Firebase Auth accounts (or finds existing ones)
 * 3. Sets custom claim { announcer: true }
 * 4. Creates new Firestore document with Auth UID as doc ID
 * 5. Removes password field from Firestore
 * 6. Deletes old document if doc ID changed
 * 
 * Usage:
 *   node scripts/migrateAnnouncers.js
 */

async function migrateAnnouncers() {
  const db = admin.firestore();
  const auth = admin.auth();
  
  console.log('\n🔄 Starting Announcer Migration...\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Get all announcers from Firestore
    const announcersSnapshot = await db.collection('announcers').get();
    
    if (announcersSnapshot.empty) {
      console.log('⚠️  No announcers found in Firestore');
      console.log('\nNothing to migrate.');
      process.exit(0);
    }
    
    console.log(`📋 Found ${announcersSnapshot.size} announcer(s) to migrate\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    
    for (const doc of announcersSnapshot.docs) {
      const announcer = doc.data();
      const oldDocId = doc.id;
      
      console.log(`\n───────────────────────────────────────────────────────────`);
      console.log(`📧 Processing: ${announcer.email}`);
      console.log(`   Old Doc ID: ${oldDocId}`);
      
      try {
        // Validate required fields
        if (!announcer.email || !announcer.name) {
          console.log('   ⚠️  Missing required fields (email or name), skipping...');
          skippedCount++;
          continue;
        }
        
        // 1. Create or get Auth user
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(announcer.email);
          console.log(`   ✓ Firebase Auth user exists: ${userRecord.uid}`);
          
          // Check if this is already the correct document (uid matches)
          if (oldDocId === userRecord.uid) {
            console.log(`   ℹ️  Document ID already matches UID`);
            
            // Just need to set custom claim and remove password
            await auth.setCustomUserClaims(userRecord.uid, { announcer: true });
            console.log(`   ✓ Custom claim set`);
            
            // Remove password field if it exists
            if (announcer.password) {
              await db.collection('announcers').doc(oldDocId).update({
                password: admin.firestore.FieldValue.delete()
              });
              console.log(`   ✓ Password field removed from Firestore`);
            }
            
            console.log(`   ✅ Migration complete (already had correct structure)`);
            successCount++;
            continue;
          }
          
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            // Create new Auth user with temporary password
            const tempPassword = generateRandomPassword();
            userRecord = await auth.createUser({
              email: announcer.email,
              password: tempPassword,
              displayName: announcer.name,
            });
            console.log(`   ✓ Created Firebase Auth user: ${userRecord.uid}`);
            console.log(`   ⚠️  Temporary password: ${tempPassword}`);
            console.log(`   ℹ️  User should reset password on first login`);
          } else {
            throw error;
          }
        }
        
        const uid = userRecord.uid;
        
        // 2. Set custom claim
        await auth.setCustomUserClaims(uid, { announcer: true });
        console.log(`   ✓ Custom claim 'announcer: true' set`);
        
        // 3. Prepare new Firestore document (without password)
        const newAnnouncerData = {
          name: announcer.name,
          email: announcer.email,
          affiliation_name: announcer.affiliation_name || '',
          affiliation_type: announcer.affiliation_type || '',
          phone: announcer.phone || '',
          role: announcer.role || '',
          status: announcer.status || 'active',
          total_announcements: announcer.total_announcements || 0,
          joined_date: announcer.joined_date || admin.firestore.FieldValue.serverTimestamp(),
        };
        
        // Preserve profile picture if exists
        if (announcer.profilePicture) {
          newAnnouncerData.profilePicture = announcer.profilePicture;
        }
        
        // ⭐ NO PASSWORD FIELD - that's the whole point!
        
        // 4. Create new document with Auth UID
        await db.collection('announcers').doc(uid).set(newAnnouncerData);
        console.log(`   ✓ Created new Firestore document: /announcers/${uid}`);
        
        // 5. Delete old document if ID changed
        if (oldDocId !== uid) {
          await db.collection('announcers').doc(oldDocId).delete();
          console.log(`   ✓ Deleted old document: ${oldDocId}`);
        }
        
        console.log(`   ✅ Successfully migrated: ${announcer.email}`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Failed to migrate ${announcer.email}:`, error.message);
        failCount++;
      }
    }
    
    // Final summary
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`\n🎉 Migration Complete!\n`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    if (failCount > 0) {
      console.log(`   ❌ Failed: ${failCount}`);
    }
    if (skippedCount > 0) {
      console.log(`   ⚠️  Skipped: ${skippedCount}`);
    }
    console.log(`\n───────────────────────────────────────────────────────────`);
    console.log(`\n📝 Next Steps:\n`);
    console.log(`   1. Check Firebase Console → Authentication`);
    console.log(`      All announcers should have { announcer: true } custom claim`);
    console.log(`\n   2. Check Firebase Console → Firestore → announcers collection`);
    console.log(`      Document IDs should match Firebase Auth UIDs`);
    console.log(`      No password fields should exist`);
    console.log(`\n   3. Deploy your Firestore rules:`);
    console.log(`      firebase deploy --only firestore:rules`);
    console.log(`\n   4. Users with new Auth accounts need to reset passwords`);
    console.log(`\n   5. iOS app must force token refresh on login:`);
    console.log(`      Auth.auth().currentUser?.getIDTokenForcingRefresh(true)`);
    console.log(`\n═══════════════════════════════════════════════════════════\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
}

/**
 * Generate a random secure password for new Auth users
 */
function generateRandomPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Run the migration
migrateAnnouncers();
