import { Meal, User, Payment, Split } from "../types";
import { DEMO_MODE } from "../config";

// ─── Lazy Firebase references (only initialized when not in demo mode) ──
let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _storage: any = null;
let _initPromise: Promise<void> | null = null;

function ensureFirebase(): Promise<void> {
  if (DEMO_MODE) return Promise.resolve();
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { initializeApp } = await import("firebase/app");
    const { getAuth } = await import("firebase/auth");
    const { getFirestore } = await import("firebase/firestore");
    const { getStorage } = await import("firebase/storage");

    _app = initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _storage = getStorage(_app);
  })();

  return _initPromise;
}

// ─── Auth ───────────────────────────────────────────────
export function onAuthChange(callback: (user: any | null) => void): () => void {
  if (DEMO_MODE) {
    // Demo mode: immediately report "not signed in"
    setTimeout(() => callback(null), 0);
    return () => {};
  }

  // Fire-and-forget init then subscribe
  let unsubscribe = () => {};
  ensureFirebase().then(async () => {
    const { onAuthStateChanged } = await import("firebase/auth");
    unsubscribe = onAuthStateChanged(_auth, callback);
  });
  return () => unsubscribe();
}

export async function signOut() {
  if (DEMO_MODE) return;
  await ensureFirebase();
  const { signOut: fbSignOut } = await import("firebase/auth");
  return fbSignOut(_auth);
}

// ─── User Profile ───────────────────────────────────────
export async function createUserProfile(user: Omit<User, "createdAt">) {
  if (DEMO_MODE) return;
  await ensureFirebase();
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  await setDoc(doc(_db, "users", user.id), { ...user, createdAt: serverTimestamp() });
}

export async function getUserProfile(userId: string): Promise<User | null> {
  if (DEMO_MODE) return null;
  await ensureFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(_db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function updateUserStripeId(userId: string, stripeCustomerId: string) {
  if (DEMO_MODE) return;
  await ensureFirebase();
  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(_db, "users", userId), { stripeCustomerId });
}

// ─── Meals ──────────────────────────────────────────────
export async function createMeal(meal: Omit<Meal, "id" | "createdAt" | "updatedAt">): Promise<string> {
  if (DEMO_MODE) return "demo-meal-" + Date.now();
  await ensureFirebase();
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const docRef = await addDoc(collection(_db, "meals"), {
    ...meal,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getMeal(mealId: string): Promise<Meal | null> {
  if (DEMO_MODE) return null;
  await ensureFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(_db, "meals", mealId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Meal;
}

export async function updateMealSplits(mealId: string, splits: Split[]) {
  if (DEMO_MODE) return;
  await ensureFirebase();
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  await updateDoc(doc(_db, "meals", mealId), {
    splits,
    status: "pending_payment",
    updatedAt: serverTimestamp(),
  });
}

export async function updateMealStatus(mealId: string, status: Meal["status"]) {
  if (DEMO_MODE) return;
  await ensureFirebase();
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  await updateDoc(doc(_db, "meals", mealId), { status, updatedAt: serverTimestamp() });
}

export function subscribToMeal(mealId: string, callback: (meal: Meal) => void): () => void {
  if (DEMO_MODE) return () => {};
  let unsub = () => {};
  ensureFirebase().then(async () => {
    const { doc, onSnapshot } = await import("firebase/firestore");
    unsub = onSnapshot(doc(_db, "meals", mealId), (snapshot: any) => {
      if (snapshot.exists()) callback({ id: snapshot.id, ...snapshot.data() } as Meal);
    });
  });
  return () => unsub();
}

export async function getUserMeals(userId: string): Promise<Meal[]> {
  if (DEMO_MODE) return [];
  await ensureFirebase();
  const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
  const q = query(
    collection(_db, "meals"),
    where("participants", "array-contains", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Meal);
}

// ─── Payments ───────────────────────────────────────────
export async function createPaymentRecord(payment: Omit<Payment, "id" | "createdAt">): Promise<string> {
  if (DEMO_MODE) return "demo-payment-" + Date.now();
  await ensureFirebase();
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const docRef = await addDoc(collection(_db, "payments"), {
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
  if (DEMO_MODE) return;
  await ensureFirebase();
  const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
  const update: Record<string, unknown> = { status };
  if (completedAt) update.completedAt = Timestamp.fromDate(completedAt);
  await updateDoc(doc(_db, "payments", paymentId), update);
}

// ─── Receipt Image Upload ───────────────────────────────
export async function uploadReceiptImage(mealId: string, imageUri: string): Promise<string> {
  if (DEMO_MODE) return imageUri;
  await ensureFirebase();
  const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const imageRef = ref(_storage, `receipts/${mealId}.jpg`);
  await uploadBytes(imageRef, blob);
  return getDownloadURL(imageRef);
}
