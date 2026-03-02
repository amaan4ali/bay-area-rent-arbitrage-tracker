import { useState, useEffect } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { onAuthChange, getUserProfile, createUserProfile } from "../services/firebase";
import { registerForPushNotifications } from "../services/notifications";
import { User } from "../types";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Fetch or create user profile
        let profile = await getUserProfile(fbUser.uid);

        if (!profile) {
          profile = {
            id: fbUser.uid,
            displayName: fbUser.displayName || "User",
            email: fbUser.email || "",
            phone: fbUser.phoneNumber || "",
            createdAt: new Date(),
          };
          await createUserProfile(profile);
        }

        setUser(profile);

        // Register for push notifications
        await registerForPushNotifications(fbUser.uid);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, firebaseUser, loading, isAuthenticated: !!user };
}
