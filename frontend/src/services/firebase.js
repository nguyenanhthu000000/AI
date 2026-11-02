import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAmX0e-Av5jEKK6ejVDm_aGD3tjtCb9M9A",
  authDomain: "vlu-rag-assistant.firebaseapp.com",
  projectId: "vlu-rag-assistant",
  storageBucket: "vlu-rag-assistant.firebasestorage.app",
  messagingSenderId: "29037939641",
  appId: "1:29037939641:web:3fcfe37eb4a3adca038468",
  measurementId: "G-4SEM8LKRPC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();