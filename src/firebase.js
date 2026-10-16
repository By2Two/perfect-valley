import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const PLAYERS_COLLECTION = 'jogadores';
const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseEnabled = Boolean(config.apiKey && config.projectId);

let auth = null;
let db = null;
if (isFirebaseEnabled) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function observeUser(callback) {
  if (!isFirebaseEnabled) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export async function createAccount(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }
  return credential;
}
export const recoverPassword = (email) => sendPasswordResetEmail(auth, email);
export const signOutUser = () => signOut(auth);

export async function loadCloudSave(uid) {
  const snap = await getDoc(doc(db, PLAYERS_COLLECTION, uid));
  return snap.exists() ? snap.data().save : null;
}
export async function saveToCloud(uid, save) {
  await setDoc(doc(db, PLAYERS_COLLECTION, uid), { save, updatedAt: save.updatedAt });
}
