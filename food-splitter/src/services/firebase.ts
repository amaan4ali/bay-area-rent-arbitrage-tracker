import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  PhoneAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Meal, User, Payment, Split } from "../types";

// ─── Firebase Config ────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ─── Auth ───────────────────────────────────────────────
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

// ─── User Profile ───────────────────────────────────────
export async function createUserProfile(user: Omit<User, "createdAt">) {
  const userRef = doc(db, "users", user.id);
  await updateDoc(userRef, {
    ...user,
    createdAt: serverTimestamp(),
  }).catch(() =>
    // Document doesn't exist yet, create it
    addDoc(collection(db, "users"), {
      ...user,
      createdAt: serverTimestamp(),
    })
  );
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() } as User;
}

export async function updateUserStripeId(userId: string, stripeCustomerId: string) {
  await updateDoc(doc(db, "users", userId), { stripeCustomerId });
}

// ─── Meals ──────────────────────────────────────────────
export async function createMeal(meal: Omit<Meal, "id" | "createdAt" | "updatedAt">) {
  const docRef = await addDoc(collection(db, "meals"), {
    ...meal,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getMeal(mealId: string): Promise<Meal | null> {
  const mealDoc = await getDoc(doc(db, "meals", mealId));
  if (!mealDoc.exists()) return null;
  return { id: mealDoc.id, ...mealDoc.data() } as Meal;
}

export async function updateMealSplits(mealId: string, splits: Split[]) {
  await updateDoc(doc(db, "meals", mealId), {
    splits,
    status: "pending_payment",
    updatedAt: serverTimestamp(),
  });
}

export async function updateMealStatus(mealId: string, status: Meal["status"]) {
  await updateDoc(doc(db, "meals", mealId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function subscribToMeal(mealId: string, callback: (meal: Meal) => void) {
  return onSnapshot(doc(db, "meals", mealId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Meal);
    }
  });
}

export async function getUserMeals(userId: string): Promise<Meal[]> {
  const q = query(
    collection(db, "meals"),
    where("participants", "array-contains", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Meal);
}

// ─── Payments ───────────────────────────────────────────
export async function createPaymentRecord(payment: Omit<Payment, "id" | "createdAt">) {
  const docRef = await addDoc(collection(db, "payments"), {
    ...payment,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: Payment["status"],
  completedAt?: Date
) {
  const update: Record<string, unknown> = { status };
  if (completedAt) update.completedAt = Timestamp.fromDate(completedAt);
  await updateDoc(doc(db, "payments", paymentId), update);
}

// ─── Receipt Image Upload ───────────────────────────────
export async function uploadReceiptImage(mealId: string, imageUri: string): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const imageRef = ref(storage, `receipts/${mealId}.jpg`);
  await uploadBytes(imageRef, blob);
  return getDownloadURL(imageRef);
}
