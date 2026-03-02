import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});
const db = admin.firestore();

/**
 * Creates a Stripe Connected Account for a user.
 * This lets them RECEIVE payments from friends.
 */
export const createConnectedAccount = functions.https.onRequest(async (req, res) => {
  const { userId } = req.body;

  // Create a Stripe Express connected account
  const account = await stripe.accounts.create({
    type: "express",
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { userId },
  });

  // Save account ID to Firestore
  await db.collection("users").doc(userId).update({
    stripeConnectedAccountId: account.id,
  });

  // Create an onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${req.headers.origin}/onboarding/refresh`,
    return_url: `${req.headers.origin}/onboarding/complete`,
    type: "account_onboarding",
  });

  res.json({ accountId: account.id, onboardingUrl: accountLink.url });
});

/**
 * Creates a SetupIntent so a user can save a payment method.
 * This lets them SEND payments to friends.
 */
export const createSetupIntent = functions.https.onRequest(async (req, res) => {
  const { userId } = req.body;

  // Get or create a Stripe customer
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();
  let customerId = userData?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { userId },
    });
    customerId = customer.id;
    await db.collection("users").doc(userId).update({ stripeCustomerId: customerId });
  }

  // Create ephemeral key for the mobile SDK
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2024-12-18.acacia" }
  );

  // Create setup intent
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: { enabled: true },
  });

  res.json({
    setupIntentClientSecret: setupIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
  });
});

/**
 * Creates a PaymentIntent to charge a user and transfer to the payer.
 *
 * Flow:
 * 1. Charges the debtor's saved payment method
 * 2. Transfers the money to the payer's connected Stripe account
 * 3. Stripe handles the bank deposit to the payer
 */
export const createPaymentIntent = functions.https.onRequest(async (req, res) => {
  const { mealId, fromUserId, toUserId, amountCents } = req.body;

  // Get both users' Stripe info
  const [fromUserDoc, toUserDoc] = await Promise.all([
    db.collection("users").doc(fromUserId).get(),
    db.collection("users").doc(toUserId).get(),
  ]);

  const fromUser = fromUserDoc.data();
  const toUser = toUserDoc.data();

  if (!fromUser?.stripeCustomerId) {
    res.status(400).json({ message: "Sender has no payment method linked" });
    return;
  }

  if (!toUser?.stripeConnectedAccountId) {
    res.status(400).json({ message: "Recipient has no bank account linked" });
    return;
  }

  // Platform fee (e.g., 1.5% to cover Stripe fees + small margin)
  const platformFee = Math.round(amountCents * 0.015);

  // Create payment intent with transfer
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: fromUser.stripeCustomerId,
    // Automatically use the customer's saved payment method
    automatic_payment_methods: { enabled: true },
    // Transfer to the payer's connected account
    transfer_data: {
      destination: toUser.stripeConnectedAccountId,
    },
    application_fee_amount: platformFee,
    metadata: {
      mealId,
      fromUserId,
      toUserId,
    },
  });

  res.json({
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
  });
});

/**
 * Stripe webhook handler.
 * Listens for successful payments and updates Firestore.
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { mealId, fromUserId } = paymentIntent.metadata;

    if (mealId && fromUserId) {
      // Update the payment record in Firestore
      const paymentsQuery = await db
        .collection("payments")
        .where("mealId", "==", mealId)
        .where("fromUserId", "==", fromUserId)
        .limit(1)
        .get();

      if (!paymentsQuery.empty) {
        await paymentsQuery.docs[0].ref.update({
          status: "completed",
          stripePaymentIntentId: paymentIntent.id,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Update the split status in the meal document
      const mealRef = db.collection("meals").doc(mealId);
      const mealDoc = await mealRef.get();
      const meal = mealDoc.data();

      if (meal) {
        const updatedSplits = meal.splits.map((split: { userId: string }) =>
          split.userId === fromUserId
            ? { ...split, paymentStatus: "completed", paidAt: new Date() }
            : split
        );

        const allPaid = updatedSplits.every(
          (s: { paymentStatus: string }) => s.paymentStatus === "completed"
        );

        await mealRef.update({
          splits: updatedSplits,
          status: allPaid ? "settled" : "pending_payment",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send push notification to the payer
        if (allPaid) {
          // All settled notification
          const payerDoc = await db.collection("users").doc(meal.payerId).get();
          const payerData = payerDoc.data();
          if (payerData?.pushToken) {
            // Send via Expo Push API
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: payerData.pushToken,
                title: "All settled!",
                body: `Everyone has paid their share for "${meal.name}"`,
              }),
            });
          }
        }
      }
    }
  }

  res.json({ received: true });
});

/**
 * Send push notification when someone is added to a meal.
 */
export const onMealCreated = functions.firestore
  .document("meals/{mealId}")
  .onCreate(async (snapshot) => {
    const meal = snapshot.data();
    const payerDoc = await db.collection("users").doc(meal.payerId).get();
    const payerName = payerDoc.data()?.displayName || "Someone";

    // Notify all participants except the creator
    for (const participantId of meal.participants) {
      if (participantId === meal.createdBy) continue;

      const userDoc = await db.collection("users").doc(participantId).get();
      const pushToken = userDoc.data()?.pushToken;

      if (pushToken) {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: pushToken,
            title: "New bill to split!",
            body: `${payerName} wants to split "${meal.name}" with you`,
            data: { mealId: snapshot.id },
          }),
        });
      }
    }
  });
