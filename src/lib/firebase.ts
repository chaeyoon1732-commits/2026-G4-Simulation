import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Debug: Log current Firebase Project ID
console.log('[Firebase Init] Environment:', {
  projectId: firebaseConfig.projectId,
  authDomain: (firebaseConfig as any).authDomain,
  origin: window.location.origin
});

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to read a non-existent doc just to check connectivity
    await getDocFromCache(doc(db, '_connection_test_', 'init'));
    console.log('[Firebase] Connection test: OK');
  } catch (error: any) {
    console.warn('[Firebase] Connection test info:', error.message);
  }
}
testConnection();
