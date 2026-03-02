#!/bin/bash
# ================================================================
# FoodSplitter — Build & Submit to App Store / Play Store
# ================================================================
#
# This script automates the entire build + submission pipeline.
#
# Prerequisites:
#   1. Apple Developer Account ($99/year) — https://developer.apple.com
#   2. App Store Connect app created — https://appstoreconnect.apple.com
#   3. EAS CLI installed: npm install -g eas-cli
#   4. Logged in to EAS: eas login
#   5. eas.json configured with your Apple ID and team ID
#   6. For Android: Google Play Console account + service account JSON
#
# Usage:
#   ./scripts/build-and-submit.sh ios        # Build + submit iOS
#   ./scripts/build-and-submit.sh android    # Build + submit Android
#   ./scripts/build-and-submit.sh both       # Build + submit both
#   ./scripts/build-and-submit.sh build-only # Build without submitting
# ================================================================

set -e

PLATFORM=${1:-"ios"}
PROFILE="production"

echo "============================================"
echo "  FoodSplitter Build & Submit Pipeline"
echo "============================================"
echo ""

# ─── Pre-flight checks ─────────────────────────────────
echo "[1/5] Pre-flight checks..."

if ! command -v eas &> /dev/null; then
    echo "ERROR: EAS CLI not found. Install with: npm install -g eas-cli"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found."
    exit 1
fi

# Check eas.json has been configured
if grep -q "YOUR_APPLE_ID" eas.json; then
    echo "ERROR: eas.json still has placeholder values."
    echo "Update YOUR_APPLE_ID, YOUR_APP_STORE_CONNECT_APP_ID, and YOUR_TEAM_ID."
    exit 1
fi

echo "Pre-flight checks passed."
echo ""

# ─── Generate icons ────────────────────────────────────
echo "[2/5] Generating app icons..."
if [ -f "assets/icon-source.png" ]; then
    node scripts/generate-icons.js
else
    echo "WARNING: No icon-source.png found. Using placeholders."
    echo "Create a 1024x1024 PNG at assets/icon-source.png for production."
    node scripts/generate-icons.js
fi
echo ""

# ─── Install dependencies ──────────────────────────────
echo "[3/5] Installing dependencies..."
npm install
echo ""

# ─── Build ─────────────────────────────────────────────
echo "[4/5] Building for ${PLATFORM}..."

case $PLATFORM in
    "ios")
        echo "Building iOS production bundle..."
        eas build --platform ios --profile $PROFILE --non-interactive
        ;;
    "android")
        echo "Building Android production bundle..."
        eas build --platform android --profile $PROFILE --non-interactive
        ;;
    "both")
        echo "Building for both platforms..."
        eas build --platform all --profile $PROFILE --non-interactive
        ;;
    "build-only")
        echo "Building for iOS (no submit)..."
        eas build --platform ios --profile $PROFILE --non-interactive
        echo ""
        echo "Build complete. Skipping submission."
        echo "To submit later: eas submit --platform ios --profile production"
        exit 0
        ;;
    *)
        echo "Unknown platform: $PLATFORM"
        echo "Usage: $0 [ios|android|both|build-only]"
        exit 1
        ;;
esac

echo ""

# ─── Submit ────────────────────────────────────────────
echo "[5/5] Submitting to store..."

case $PLATFORM in
    "ios")
        echo "Submitting to App Store Connect..."
        eas submit --platform ios --profile production --non-interactive
        echo ""
        echo "============================================"
        echo "  iOS build submitted to App Store Connect!"
        echo "============================================"
        echo ""
        echo "Next steps:"
        echo "  1. Go to https://appstoreconnect.apple.com"
        echo "  2. Select FoodSplitter"
        echo "  3. The build will appear under TestFlight in ~15 minutes"
        echo "  4. Add screenshots, description from store/app-store-metadata.json"
        echo "  5. Submit for Apple review"
        echo ""
        echo "Apple review typically takes 24-48 hours."
        ;;
    "android")
        echo "Submitting to Google Play Console..."
        eas submit --platform android --profile production --non-interactive
        echo ""
        echo "============================================"
        echo "  Android build submitted to Play Console!"
        echo "============================================"
        ;;
    "both")
        echo "Submitting to both stores..."
        eas submit --platform ios --profile production --non-interactive
        eas submit --platform android --profile production --non-interactive
        echo ""
        echo "============================================"
        echo "  Submitted to both stores!"
        echo "============================================"
        ;;
esac

echo ""
echo "Done!"
