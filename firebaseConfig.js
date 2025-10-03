import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbhxal8owxGBXAxKl826Gh8tK4SBCBR70",
  authDomain: "brancoapp.firebaseapp.com",
  projectId: "brancoapp",
  storageBucket: "brancoapp.firebasestorage.app",
  messagingSenderId: "700909183063",
  appId: "1:700909183063:web:398153edb7f4bd92b54312"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
