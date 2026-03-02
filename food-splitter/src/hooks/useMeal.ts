import { useState, useEffect } from "react";
import {
  createMeal as createMealInDb,
  getMeal,
  subscribToMeal,
  updateMealSplits,
  updateMealStatus,
  getUserMeals,
} from "../services/firebase";
import { calculateSplits, calculatePayments } from "../utils/splitCalculator";
import { Meal, BillItem, Split, SplitCalculationInput } from "../types";

// ─── Single meal (real-time) ────────────────────────────
export function useMeal(mealId: string | null) {
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mealId) {
      setLoading(false);
      return;
    }

    // Real-time subscription — everyone sees updates live
    const unsubscribe = subscribToMeal(mealId, (updatedMeal) => {
      setMeal(updatedMeal);
      setLoading(false);
    });

    return unsubscribe;
  }, [mealId]);

  // Calculate and save splits
  const finalizeSplits = async (
    items: BillItem[],
    taxAmount: number,
    tipAmount: number
  ) => {
    if (!meal) return;

    const input: SplitCalculationInput = {
      items,
      taxAmount,
      tipAmount,
      payerId: meal.payerId,
      participants: meal.participants,
    };

    const splits = calculateSplits(input);
    await updateMealSplits(meal.id, splits);
  };

  // Mark a split as paid
  const markSplitPaid = async (userId: string, paymentId: string) => {
    if (!meal) return;

    const updatedSplits = meal.splits.map((s) =>
      s.userId === userId
        ? { ...s, paymentStatus: "completed" as const, paymentId, paidAt: new Date() }
        : s
    );

    await updateMealSplits(meal.id, updatedSplits);

    // Check if all splits are settled
    const allPaid = updatedSplits.every((s) => s.paymentStatus === "completed");
    if (allPaid) {
      await updateMealStatus(meal.id, "settled");
    }
  };

  return { meal, loading, finalizeSplits, markSplitPaid };
}

// ─── All meals for a user ───────────────────────────────
export function useUserMeals(userId: string | null) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    getUserMeals(userId).then((result) => {
      setMeals(result);
      setLoading(false);
    });
  }, [userId]);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getUserMeals(userId);
    setMeals(result);
    setLoading(false);
  };

  return { meals, loading, refresh };
}

// ─── Create a new meal ──────────────────────────────────
export function useCreateMeal() {
  const [creating, setCreating] = useState(false);

  const createNewMeal = async (
    name: string,
    payerId: string,
    participants: string[]
  ): Promise<string> => {
    setCreating(true);
    try {
      const mealId = await createMealInDb({
        name,
        createdBy: payerId,
        payerId,
        participants,
        items: [],
        taxAmount: 0,
        tipAmount: 0,
        totalAmount: 0,
        status: "draft",
        splits: [],
      });
      return mealId;
    } finally {
      setCreating(false);
    }
  };

  return { createNewMeal, creating };
}
