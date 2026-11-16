/**
 * BY ANGÉLY — Recuperação de Senha Oficial via Firebase Authentication (Web SDK v10)
 * Reutiliza exclusivamente a configuração pública do projeto Firebase existente.
 */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAledB2RNyAadWuxG2GAVdXwqn_eZFgpys',
  authDomain: 'launcher-3964c6e7.firebaseapp.com',
  projectId: 'launcher-3964c6e7',
  storageBucket: 'launcher-3964c6e7.firebasestorage.app',
  messagingSenderId: '1031057115524',
  appId: '1:1031057115524:web:80fc0e2eac12c5493275d1'
};

let firebaseAppInstance = null;
let firebaseAuthInstance = null;

function getFirebaseAuthInstance() {
  if (firebaseAuthInstance) return firebaseAuthInstance;
  const existingApps = getApps();
  firebaseAppInstance = existingApps.length > 0 ? existingApps[0] : initializeApp(FIREBASE_CONFIG);
  firebaseAuthInstance = getAuth(firebaseAppInstance);
  firebaseAuthInstance.languageCode = 'pt-BR';
  return firebaseAuthInstance;
}

function getRecoveryHandler() {
  if (typeof window !== 'undefined' && window.__BY_ANGELY_FIREBASE_AUTH_MOCK__) {
    return window.__BY_ANGELY_FIREBASE_AUTH_MOCK__;
  }
  return null;
}

function mapFirebaseRecoveryError(err, fallbackMsg) {
  const code = (err && err.code) || '';
  if (code === 'auth/invalid-email') {
    return {
      code,
      message: 'O endereço de e-mail informado é inválido. Confira e tente novamente.'
    };
  }
  if (code === 'auth/expired-action-code') {
    return {
      code,
      message: 'Este link de redefinição expirou. Solicite um novo e-mail de recuperação de senha.'
    };
  }
  if (code === 'auth/invalid-action-code') {
    return {
      code,
      message: 'Este link de redefinição é inválido ou já foi utilizado. Solicite um novo link.'
    };
  }
  if (code === 'auth/weak-password') {
    return {
      code,
      message: 'A nova senha não atende aos requisitos mínimos de segurança (utilize pelo menos 6 caracteres).'
    };
  }
  if (code === 'auth/user-disabled') {
    return {
      code,
      message: 'Esta conta está desativada no momento. Entre em contato com o atendimento da loja.'
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      code,
      message: 'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.'
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      code,
      message: 'Falha de conexão ao comunicar com o Firebase. Verifique sua internet e tente novamente.'
    };
  }
  return {
    code: code || 'auth/unknown',
    message: fallbackMsg || 'Não foi possível concluir a verificação no Firebase Authentication.'
  };
}

async function requestPasswordReset(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      code: 'auth/invalid-email',
      error: 'Informe um endereço de e-mail válido.'
    };
  }

  const mock = getRecoveryHandler();
  if (mock && typeof mock.requestPasswordReset === 'function') {
    return mock.requestPasswordReset(email);
  }

  try {
    const auth = getFirebaseAuthInstance();
    const continueBase = typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://by-angely.onrender.com';
    await sendPasswordResetEmail(auth, email, {
      url: continueBase + '/redefinir-senha',
      handleCodeInApp: false
    });
    return { ok: true };
  } catch (err) {
    const code = (err && err.code) || '';
    // Nunca revela se o e-mail está ou não cadastrado caso o projeto retorne auth/user-not-found
    if (code === 'auth/user-not-found') {
      return { ok: true };
    }
    const mapped = mapFirebaseRecoveryError(err, 'Não foi possível enviar o e-mail de redefinição agora.');
    return { ok: false, code: mapped.code, error: mapped.message };
  }
}

async function verifyResetCode(oobCode) {
  const codeVal = String(oobCode || '').trim();
  if (!codeVal) {
    return {
      ok: false,
      code: 'auth/invalid-action-code',
      error: 'Código de redefinição ausente ou inválido.'
    };
  }

  const mock = getRecoveryHandler();
  if (mock && typeof mock.verifyResetCode === 'function') {
    return mock.verifyResetCode(codeVal);
  }

  try {
    const auth = getFirebaseAuthInstance();
    const email = await verifyPasswordResetCode(auth, codeVal);
    return { ok: true, email: String(email || '').trim().toLowerCase() };
  } catch (err) {
    const mapped = mapFirebaseRecoveryError(err, 'Este link de redefinição é inválido ou expirou.');
    return { ok: false, code: mapped.code, error: mapped.message };
  }
}

async function confirmReset(oobCode, newPassword) {
  const codeVal = String(oobCode || '').trim();
  const pwd = String(newPassword || '');
  if (!codeVal) {
    return {
      ok: false,
      code: 'auth/invalid-action-code',
      error: 'Código de redefinição ausente ou inválido.'
    };
  }
  if (pwd.length < 6) {
    return {
      ok: false,
      code: 'auth/weak-password',
      error: 'A nova senha deve ter no mínimo 6 caracteres.'
    };
  }

  const mock = getRecoveryHandler();
  if (mock && typeof mock.confirmReset === 'function') {
    return mock.confirmReset(codeVal, pwd);
  }

  try {
    const auth = getFirebaseAuthInstance();
    await confirmPasswordReset(auth, codeVal, pwd);
    return { ok: true };
  } catch (err) {
    const mapped = mapFirebaseRecoveryError(err, 'Não foi possível redefinir a senha. Solicite um novo link.');
    return { ok: false, code: mapped.code, error: mapped.message };
  }
}

async function signInAndExtractIdToken(email, password) {
  const emailNorm = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!emailNorm || !pwd) return { ok: false, idToken: '' };

  const mock = getRecoveryHandler();
  if (mock && typeof mock.signInAndExtractIdToken === 'function') {
    return mock.signInAndExtractIdToken(emailNorm, pwd);
  }

  try {
    const auth = getFirebaseAuthInstance();
    const cred = await signInWithEmailAndPassword(auth, emailNorm, pwd);
    const idToken = cred && cred.user ? await cred.user.getIdToken() : '';
    try {
      await signOut(auth);
    } catch (_signOutErr) {}
    return { ok: Boolean(idToken), idToken };
  } catch (err) {
    return { ok: false, idToken: '', code: (err && err.code) || 'auth/unknown' };
  }
}

if (typeof window !== 'undefined') {
  window.ByAngelyFirebaseAuth = {
    projectId: FIREBASE_CONFIG.projectId,
    authDomain: FIREBASE_CONFIG.authDomain,
    requestPasswordReset,
    verifyResetCode,
    confirmReset,
    signInAndExtractIdToken,
    mapFirebaseRecoveryError
  };
}
