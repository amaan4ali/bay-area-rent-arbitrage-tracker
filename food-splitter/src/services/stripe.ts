/**
 * Stripe Connect integration for peer-to-peer payments.
 *
 * How it works:
 * 1. Each user creates a Stripe "Connected Account" (one-time onboarding)
 * 2. They link their bank account or debit card to that account
 * 3. When someone owes money, the app creates a PaymentIntent:
 *    - Charges the debtor's payment method
 *    - Transfers the money to the payer's connected account
 * 4. Stripe handles compliance, fraud detection, and bank transfers
 *
 * The actual charge + transfer happens in Firebase Cloud Functions (server-side)
 * for security. The client only triggers the flow and confirms payment.
 */

import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://us-central1-YOUR_PROJECT.cloudfunctions.net";

// ─── Create Connected Account (one-time setup) ─────────
// User links their bank account so they can RECEIVE money
export async function createConnectedAccount(userId: string): Promise<string> {
  const response = await fetch(`${API_URL}/createConnectedAccount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const { accountId, onboardingUrl } = await response.json();
  return onboardingUrl; // Open this URL for user to complete Stripe onboarding
}

// ─── Set up Payment Method (one-time setup) ─────────────
// User links their card so they can SEND money
export async function setupPaymentMethod(userId: string): Promise<{
  setupIntentClientSecret: string;
  ephemeralKey: string;
  customerId: string;
}> {
  const response = await fetch(`${API_URL}/createSetupIntent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

// ─── Initiate Payment ───────────────────────────────────
// Called when a user taps "Pay" on their split
export async function initiatePayment(
  mealId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<{ paymentIntentId: string; clientSecret: string }> {
  const response = await fetch(`${API_URL}/createPaymentIntent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mealId,
      fromUserId,
      toUserId,
      amountCents: Math.round(amount * 100), // Stripe uses cents
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Payment failed");
  }

  return response.json();
}

// ─── Present Payment Sheet ──────────────────────────────
// Shows Stripe's native payment UI for the user to confirm
export async function presentPayment(
  clientSecret: string,
  merchantName: string = "FoodSplitter"
): Promise<boolean> {
  const { error: initError } = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: merchantName,
    defaultBillingDetails: { name: "" },
  });

  if (initError) {
    throw new Error(initError.message);
  }

  const { error: presentError } = await presentPaymentSheet();

  if (presentError) {
    if (presentError.code === "Canceled") {
      return false; // User cancelled, not an error
    }
    throw new Error(presentError.message);
  }

  return true; // Payment succeeded
}

// ─── Full Payment Flow ──────────────────────────────────
// Combines initiate + present into one call
export async function payShare(
  mealId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<{ success: boolean; paymentIntentId?: string }> {
  // 1. Create payment intent on server
  const { paymentIntentId, clientSecret } = await initiatePayment(
    mealId,
    fromUserId,
    toUserId,
    amount
  );

  // 2. Show Stripe payment sheet to user
  const confirmed = await presentPayment(clientSecret);

  if (!confirmed) {
    return { success: false };
  }

  // 3. Payment confirmed — server webhook will update Firestore
  return { success: true, paymentIntentId };
}
