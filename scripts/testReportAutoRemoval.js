const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testAutoRemoval() {
  console.log('Creating a test report with category "scam"...');
  
  try {
    // Create a test post first
    const testPost = await db.collection('posts').add({
      content: 'Test post for auto-removal',
      status: 'active',
      userId: 'test-user-id',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      category: 'general',
      likeCount: 0,
      dislikeCount: 0
    });
    
    console.log(`Test post created with ID: ${testPost.id}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a high severity report for this post
    const testReport = await db.collection('reports').add({
      postId: testPost.id,
      postContent: 'Test post for auto-removal',
      category: 'scam', // high severity category
      description: 'This is a test scam report',
      reporter: {
        id: 'test-reporter-id',
        name: 'Test Reporter'
      },
      reported: {
        id: 'test-user-id',
        name: 'Test User'
      },
      reportCount: 1,
      status: 'pending',
      reportDate: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Test report created with ID: ${testReport.id}`);
    console.log('Category: scam (HIGH SEVERITY)');
    console.log('\nWaiting 10 seconds for Cloud Function to process...\n');
    
    // Wait for Cloud Function to process
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if post was auto-removed
    const postSnap = await db.collection('posts').doc(testPost.id).get();
    const postData = postSnap.data();
    
    console.log('Post status after Cloud Function:', postData.status);
    console.log('Post removedAt:', postData.removedAt ? 'Set' : 'Not set');
    console.log('Post removedReason:', postData.removedReason || 'Not set');
    
    // Check if report was resolved
    const reportSnap = await db.collection('reports').doc(testReport.id).get();
    const reportData = reportSnap.data();
    
    console.log('\nReport status after Cloud Function:', reportData.status);
    console.log('Report autoRemoved flag:', reportData.autoRemoved || false);
    
    // Cleanup
    console.log('\nCleaning up test data...');
    await db.collection('posts').doc(testPost.id).delete();
    await db.collection('reports').doc(testReport.id).delete();
    
    // Determine result
    if (postData.status === 'removed' && reportData.status === 'resolved') {
      console.log('\n✅ SUCCESS: Cloud Function is working correctly!');
      console.log('Post was auto-removed and report was auto-resolved.');
    } else {
      console.log('\n❌ FAILED: Cloud Function did not execute properly');
      console.log('Expected: Post status = "removed", Report status = "resolved"');
      console.log(`Got: Post status = "${postData.status}", Report status = "${reportData.status}"`);
      console.log('\nPossible causes:');
      console.log('1. Cloud Function is not deployed correctly');
      console.log('2. Cloud Function is not triggered (check trigger path)');
      console.log('3. ServiceAccount doesn\'t have permissions');
      console.log('\nCheck Cloud Function logs with: firebase functions:log --only handleNewReport');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    process.exit(0);
  }
}

testAutoRemoval();
