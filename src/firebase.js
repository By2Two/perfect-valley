import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Sem as chaves no .env.local o app roda só no modo local. */
export const firebaseAtivo = Boolean(config.apiKey && config.projectId);

let auth = null;
let db = null;
if (firebaseAtivo) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function observarUsuario(cb) {
  if (!firebaseAtivo) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export const entrarComGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const entrarComEmail = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
export async function criarConta(nome, email, senha) {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  if (nome) await updateProfile(cred.user, { displayName: nome });
  return cred;
}
export const recuperarSenha = (email) => sendPasswordResetEmail(auth, email);
export const sair = () => signOut(auth);

export async function carregarNuvem(uid) {
  const snap = await getDoc(doc(db, 'jogadores', uid));
  return snap.exists() ? snap.data().save : null;
}
export async function salvarNaNuvem(uid, save) {
  await setDoc(doc(db, 'jogadores', uid), { save, atualizadoEm: save.atualizadoEm });
}
