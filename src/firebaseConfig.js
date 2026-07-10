// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsDoXgbI7gXBqeSalDJhVpWDPtJmo-C8Y",
  authDomain: "kido-surprise-delivery.firebaseapp.com",
  projectId: "kido-surprise-delivery",
  storageBucket: "kido-surprise-delivery.firebasestorage.app",
  messagingSenderId: "423531320362",
  appId: "1:423531320362:web:b4f53c853b0033f599df53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);