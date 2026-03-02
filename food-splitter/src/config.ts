/**
 * App configuration.
 *
 * DEMO_MODE = true  → App runs with fake data, no Firebase/Stripe needed.
 *                      Perfect for previewing the app and testing the UI.
 *
 * DEMO_MODE = false → Full production mode with real Firebase + Stripe.
 *                      Requires .env file with valid API keys.
 *
 * The app auto-detects: if no Firebase API key is set, demo mode activates.
 */
export const DEMO_MODE = !process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
