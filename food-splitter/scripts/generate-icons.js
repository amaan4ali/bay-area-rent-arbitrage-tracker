#!/usr/bin/env node

/**
 * App Icon Generator for FoodSplitter
 *
 * Creates all required icon sizes from a single 1024x1024 source image.
 *
 * Prerequisites:
 *   npm install sharp
 *
 * Usage:
 *   1. Create a 1024x1024 PNG icon and save it as assets/icon-source.png
 *   2. Run: node scripts/generate-icons.js
 *
 * This generates:
 *   - assets/icon.png (1024x1024 — App Store)
 *   - assets/adaptive-icon.png (1024x1024 — Android adaptive)
 *   - assets/notification-icon.png (96x96 — Android notification)
 *   - assets/splash.png (1284x2778 — splash screen)
 *   - assets/favicon.png (48x48 — web)
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const SOURCE = path.join(ASSETS_DIR, "icon-source.png");

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function generateIcons() {
  // Check if source icon exists
  if (!fs.existsSync(SOURCE)) {
    console.log("No source icon found. Creating placeholder icons...");
    await createPlaceholder();
    return;
  }

  const source = sharp(SOURCE);

  // App Store icon (1024x1024, no transparency, no rounded corners)
  await source
    .clone()
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, "icon.png"));
  console.log("Created icon.png (1024x1024)");

  // Android adaptive icon (1024x1024)
  await source
    .clone()
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, "adaptive-icon.png"));
  console.log("Created adaptive-icon.png (1024x1024)");

  // Notification icon (96x96, should be simple/monochrome for Android)
  await source
    .clone()
    .resize(96, 96)
    .png()
    .toFile(path.join(ASSETS_DIR, "notification-icon.png"));
  console.log("Created notification-icon.png (96x96)");

  // Favicon for web (48x48)
  await source
    .clone()
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS_DIR, "favicon.png"));
  console.log("Created favicon.png (48x48)");

  // Splash screen (centered icon on dark background)
  const splashWidth = 1284;
  const splashHeight = 2778;
  const logoSize = 400;

  const resizedLogo = await source.clone().resize(logoSize, logoSize).png().toBuffer();

  await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 }, // #1a1a2e
    },
  })
    .composite([
      {
        input: resizedLogo,
        left: Math.round((splashWidth - logoSize) / 2),
        top: Math.round((splashHeight - logoSize) / 2) - 100,
      },
    ])
    .png()
    .toFile(path.join(ASSETS_DIR, "splash.png"));
  console.log("Created splash.png (1284x2778)");

  console.log("\nAll icons generated successfully!");
}

// Create simple placeholder icons if no source exists
async function createPlaceholder() {
  const sizes = [
    { name: "icon.png", w: 1024, h: 1024 },
    { name: "adaptive-icon.png", w: 1024, h: 1024 },
    { name: "notification-icon.png", w: 96, h: 96 },
    { name: "favicon.png", w: 48, h: 48 },
    { name: "splash.png", w: 1284, h: 2778 },
  ];

  for (const { name, w, h } of sizes) {
    const bg = name === "splash.png"
      ? { r: 26, g: 26, b: 46, alpha: 1 }
      : { r: 233, g: 69, b: 96, alpha: 1 }; // #e94560

    await sharp({
      create: { width: w, height: h, channels: 4, background: bg },
    })
      .png()
      .toFile(path.join(ASSETS_DIR, name));

    console.log(`Created placeholder ${name} (${w}x${h})`);
  }

  console.log("\nPlaceholder icons created.");
  console.log("Replace assets/icon-source.png with your real icon and re-run this script.");
}

generateIcons().catch(console.error);
