import { useState, useEffect } from "react";
import { DEMO_MODE } from "../config";
import { DEMO_USER } from "../demo-data";
import { onAuthChange, getUserProfile, createUserProfile } from "../services/firebase";
import { User } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? DEMO_USER : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return; // Already set above

    const unsubscribe = onAuthChange(async (fbUser: any) => {
      if (fbUser) {
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
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
