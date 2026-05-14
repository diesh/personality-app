import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUU1pIEQLsFuqStG1Shfx3LviL0jQI3no",
  authDomain: "personality-assessment-f58e4.firebaseapp.com",
  databaseURL: "https://personality-assessment-f58e4-default-rtdb.firebaseio.com",
  projectId: "personality-assessment-f58e4",
  storageBucket: "personality-assessment-f58e4.firebasestorage.app",
  messagingSenderId: "732989707775",
  appId: "1:732989707775:web:aaf9248beb547effd6c3ca"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);