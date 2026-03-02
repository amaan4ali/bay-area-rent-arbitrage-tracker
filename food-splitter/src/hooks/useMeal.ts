import { useState, useEffect } from "react";
import { DEMO_MODE } from "../config";
import { DEMO_MEALS } from "../demo-data";
import {
  createMeal as createMealInDb,
  subscribToMeal,
  updateMealSplits,
  updateMealStatus,
  getUserMeals,
} from "../services/firebase";
import { calculateSplits } from "../utils/splitCalculator";
import { Meal, BillItem, SplitCalculationInput } from "../types";

// ─── Single meal (real-time) ────────────────────────────
export function useMeal(mealId: string | null) {
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mealId) {
      setLoading(false);
      return;
    }

    if (DEMO_MODE) {
      const found = DEMO_MEALS.find((m) => m.id === mealId) ?? null;
      setMeal(found);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribToMeal(mealId, (updatedMeal) => {
      setMeal(updatedMeal);
      setLoading(false);
    });

    return unsubscribe;
  }, [mealId]);

  const finalizeSplits = async (items: BillItem[], taxAmount: number, tipAmount: number) => {
    if (!meal) return;

    const input: SplitCalculationInput = {
      items,
      taxAmount,
      tipAmount,
      payerId: meal.payerId,
      participants: meal.participants,
    };

    const splits = calculateSplits(input);

    if (DEMO_MODE) {
      // Update local state directly in demo mode
      setMeal({ ...meal, splits, status: "pending_payment" });
      return;
    }

    await updateMealSplits(meal.id, splits);
  };

  const markSplitPaid = async (userId: string, paymentId: string) => {
    if (!meal) return;

    const updatedSplits = meal.splits.map((s) =>
      s.userId === userId
        ? { ...s, paymentStatus: "completed" as const, paymentId, paidAt: new Date() }
        : s
    );

    const allPaid = updatedSplits.every((s) => s.paymentStatus === "completed");

    if (DEMO_MODE) {
      setMeal({ ...meal, splits: updatedSplits, status: allPaid ? "settled" : meal.status });
      return;
    }

    await updateMealSplits(meal.id, updatedSplits);
    if (allPaid) await updateMealStatus(meal.id, "settled");
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

    if (DEMO_MODE) {
      setMeals(DEMO_MEALS);
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
    if (DEMO_MODE) return; // Demo data is static
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
