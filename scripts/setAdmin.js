
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const ADMIN_UID = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_UID;

admin.auth().setCustomUserClaims(ADMIN_UID, { admin: true })
  .then(() => {
    console.log('Admin claim set');
    process.exit();
  })
  .catch(console.error);
