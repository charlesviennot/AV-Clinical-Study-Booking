import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCd6fEy1kqZrKBAcX6sK8bnTVdIlrquCLU",
  authDomain: "av-clinical-study-booking.firebaseapp.com",
  projectId: "av-clinical-study-booking",
  storageBucket: "av-clinical-study-booking.firebasestorage.app",
  messagingSenderId: "166274591856",
  appId: "1:166274591856:web:c2c848dd80f12e098d58b5",
  measurementId: "G-QJDPQ3VLL2"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Only initialize analytics in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
