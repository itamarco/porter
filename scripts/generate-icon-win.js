#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const iconPngPath = path.join(__dirname, "..", "assets", "icon.png");
const iconIcoPath = path.join(__dirname, "..", "assets", "icon.ico");

if (!fs.existsSync(iconPngPath)) {
  console.error("Error: assets/icon.png not found.");
  process.exit(1);
}

console.log("Note: Creating ICO files requires ImageMagick or an online converter.");
console.log("Please use one of the following methods:");
console.log("");
console.log("1. Using ImageMagick (if installed):");
console.log(`   convert ${iconPngPath} -define icon:auto-resize=256,128,64,48,32,16 ${iconIcoPath}`);
console.log("");
console.log("2. Using online converter:");
console.log("   Visit https://convertio.co/png-ico/ or similar");
console.log(`   Upload ${iconPngPath} and download as ${iconIcoPath}`);
console.log("");
console.log("3. Using electron-builder (will auto-convert PNG if ICO not found):");
console.log("   electron-builder can use PNG files for Windows icons, but ICO is preferred.");

process.exit(0);

