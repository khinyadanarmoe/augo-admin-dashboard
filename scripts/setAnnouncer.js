
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Script to set announcer custom claim for an existing Firebase Auth user
 * 
 * Usage:
 *   node scripts/setAnnouncer.js <user-uid>
 * 
 * Example:
 *   node scripts/setAnnouncer.js abc123def456
 */

const ANNOUNCER_UID = process.argv[2];

if (!ANNOUNCER_UID) {
  console.error('❌ Error: Please provide a user UID as an argument');
  console.log('\nUsage:');
  console.log('  node scripts/setAnnouncer.js <user-uid>');
  console.log('\nExample:');
  console.log('  node scripts/setAnnouncer.js abc123def456');
  process.exit(1);
}

console.log(`\n🔧 Setting announcer claim for user: ${ANNOUNCER_UID}\n`);

admin.auth().setCustomUserClaims(ANNOUNCER_UID, { announcer: true })
  .then(() => {
    console.log('✅ Announcer claim set successfully!');
    console.log('\n📝 Important:');
    console.log('   - The user must sign out and sign in again for the claim to take effect');
    console.log('   - Or force token refresh on the client side');
    console.log('\n💡 In Swift (iOS):');
    console.log('   Auth.auth().currentUser?.getIDTokenForcingRefresh(true) { token, error in');
    console.log('       // Token now contains announcer: true claim');
    console.log('   }');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting announcer claim:', error);
    console.log('\nPossible reasons:');
    console.log('  - User UID does not exist');
    console.log('  - serviceAccountKey.json is missing or invalid');
    console.log('  - Insufficient permissions');
    process.exit(1);
  });
