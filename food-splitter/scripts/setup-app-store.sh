#!/bin/bash
# ================================================================
# FoodSplitter — Full Setup Guide (interactive)
# ================================================================
# Run this ONCE to set up everything you need before your first build.
# ================================================================

set -e

echo "============================================"
echo "  FoodSplitter — First-Time Setup"
echo "============================================"
echo ""
echo "This script walks you through everything you"
echo "need to get FoodSplitter on the App Store."
echo ""

# ─── Step 1: Apple Developer Account ──────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Apple Developer Account"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You need an Apple Developer account (\$99/year)."
echo "Sign up at: https://developer.apple.com/programs/"
echo ""
read -p "Do you have an Apple Developer account? (y/n) " has_apple
if [ "$has_apple" != "y" ]; then
    echo "Sign up first, then re-run this script."
    echo "It takes 24-48 hours for Apple to approve."
    exit 0
fi
echo ""

# ─── Step 2: App Store Connect ────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Create App in App Store Connect"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://appstoreconnect.apple.com"
echo "2. Click 'My Apps' → '+' → 'New App'"
echo "3. Fill in:"
echo "   - Name: FoodSplitter"
echo "   - Bundle ID: com.foodsplitter.app"
echo "   - SKU: foodsplitter-001"
echo "   - Primary Language: English (U.S.)"
echo ""
read -p "Enter your App Store Connect App ID (numeric): " asc_app_id
read -p "Enter your Apple Team ID: " team_id
read -p "Enter your Apple ID email: " apple_id
echo ""

# Update eas.json with real values
if command -v sed &> /dev/null; then
    sed -i "s/YOUR_APPLE_ID@email.com/$apple_id/g" eas.json
    sed -i "s/YOUR_APP_STORE_CONNECT_APP_ID/$asc_app_id/g" eas.json
    sed -i "s/YOUR_TEAM_ID/$team_id/g" eas.json
    echo "Updated eas.json with your credentials."
fi
echo ""

# ─── Step 3: EAS CLI ─────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: EAS CLI Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v eas &> /dev/null; then
    echo "Installing EAS CLI..."
    npm install -g eas-cli
fi

echo "Logging in to EAS..."
eas login

echo "Linking project to EAS..."
eas init

echo ""

# ─── Step 4: Firebase Setup ──────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Firebase Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://console.firebase.google.com"
echo "2. Create a new project called 'food-splitter'"
echo "3. Enable these services:"
echo "   - Authentication → Phone"
echo "   - Cloud Firestore"
echo "   - Storage"
echo "   - Cloud Functions (requires Blaze plan)"
echo "4. Add an iOS app with bundle ID: com.foodsplitter.app"
echo "5. Download GoogleService-Info.plist"
echo "6. Add an Android app with package: com.foodsplitter.app"
echo "7. Download google-services.json"
echo ""
echo "Copy your Firebase config to .env:"
echo "   cp .env.example .env"
echo "   # Then fill in the values from Firebase console"
echo ""
read -p "Press Enter when Firebase is set up..."
echo ""

# ─── Step 5: Stripe Setup ───────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Stripe Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://dashboard.stripe.com/register"
echo "2. Create a Stripe account"
echo "3. Enable Stripe Connect:"
echo "   Dashboard → Connect → Get Started"
echo "4. Copy your keys to .env:"
echo "   - Publishable key (pk_test_...)"
echo "   - Secret key (sk_test_...)"
echo "5. Set up a webhook endpoint:"
echo "   - URL: https://YOUR_PROJECT.cloudfunctions.net/stripeWebhook"
echo "   - Events: payment_intent.succeeded"
echo ""
read -p "Press Enter when Stripe is set up..."
echo ""

# ─── Step 6: Deploy Cloud Functions ─────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6: Deploy Firebase Cloud Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deploying Cloud Functions..."
cd functions && npm install && cd ..
firebase deploy --only functions
echo ""

# ─── Step 7: Privacy Policy ─────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 7: Host Privacy Policy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Apple requires a privacy policy URL."
echo "Options:"
echo "  a) Host store/privacy-policy.html on your website"
echo "  b) Use Firebase Hosting: firebase deploy --only hosting"
echo "  c) Use a free host like GitHub Pages"
echo ""
echo "Then update the URL in store/app-store-metadata.json"
echo ""

# ─── Done ────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You're ready to build and submit!"
echo ""
echo "Next steps:"
echo "  1. Create your app icon (1024x1024 PNG)"
echo "     Save as: assets/icon-source.png"
echo ""
echo "  2. Build & submit:"
echo "     ./scripts/build-and-submit.sh ios"
echo ""
echo "  3. In App Store Connect, add:"
echo "     - Screenshots (see store/app-store-metadata.json)"
echo "     - Description, keywords, etc."
echo "     - Privacy policy URL"
echo ""
echo "  4. Submit for Apple review!"
echo ""
