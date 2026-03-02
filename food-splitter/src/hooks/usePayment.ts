import { useState } from "react";
import { DEMO_MODE } from "../config";
import { createPaymentRecord, updatePaymentStatus } from "../services/firebase";

export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (
    mealId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<boolean> => {
    setProcessing(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        // Simulate payment processing
        await new Promise((resolve) => setTimeout(resolve, 800));
        setProcessing(false);
        return true;
      }

      const paymentId = await createPaymentRecord({
        mealId,
        fromUserId,
        toUserId,
        amount,
        stripePaymentIntentId: "",
        status: "processing",
      });

      const { payShare } = await import("../services/stripe");
      const result = await payShare(mealId, fromUserId, toUserId, amount);

      if (result.success && result.paymentIntentId) {
        await updatePaymentStatus(paymentId, "completed", new Date());
        return true;
      } else {
        await updatePaymentStatus(paymentId, "pending");
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const onboardForPayments = async (userId: string): Promise<string> => {
    if (DEMO_MODE) return "https://example.com/demo-onboarding";
    const { createConnectedAccount } = await import("../services/stripe");
    return createConnectedAccount(userId);
  };

  const linkPaymentMethod = async (userId: string) => {
    if (DEMO_MODE) return { setupIntentClientSecret: "", ephemeralKey: "", customerId: "" };
    const { setupPaymentMethod } = await import("../services/stripe");
    return setupPaymentMethod(userId);
  };

  return { pay, onboardForPayments, linkPaymentMethod, processing, error };
}
