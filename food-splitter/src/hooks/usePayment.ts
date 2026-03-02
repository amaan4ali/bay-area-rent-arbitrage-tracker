import { useState } from "react";
import { payShare, createConnectedAccount, setupPaymentMethod } from "../services/stripe";
import { createPaymentRecord, updatePaymentStatus } from "../services/firebase";

export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Full payment flow: charge debtor → transfer to payer
  const pay = async (
    mealId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<boolean> => {
    setProcessing(true);
    setError(null);

    try {
      // 1. Create payment record in Firestore
      const paymentId = await createPaymentRecord({
        mealId,
        fromUserId,
        toUserId,
        amount,
        stripePaymentIntentId: "",
        status: "processing",
      });

      // 2. Process payment through Stripe
      const result = await payShare(mealId, fromUserId, toUserId, amount);

      if (result.success && result.paymentIntentId) {
        // 3. Update payment record with Stripe ID
        await updatePaymentStatus(paymentId, "completed", new Date());
        return true;
      } else {
        await updatePaymentStatus(paymentId, "pending");
        return false; // User cancelled
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // One-time: set up user's bank account to receive payments
  const onboardForPayments = async (userId: string): Promise<string> => {
    return createConnectedAccount(userId);
  };

  // One-time: link card to send payments
  const linkPaymentMethod = async (userId: string) => {
    return setupPaymentMethod(userId);
  };

  return { pay, onboardForPayments, linkPaymentMethod, processing, error };
}
