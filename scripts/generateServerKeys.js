/**
 * One-time script to generate server RSA key pair
 * Run this once and add the output to your .env file
 *
 * Usage: node scripts/generateServerKeys.js
 */

import crypto from "crypto";

console.log("Generating server RSA key pair (2048-bit)...\n");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// Convert to single-line format for .env file
const privateKeyOneLine = privateKey.replace(/\n/g, "\\n");
const publicKeyOneLine = publicKey.replace(/\n/g, "\\n");

console.log("=".repeat(80));
console.log("ADD THESE TO YOUR .env FILE:");
console.log("=".repeat(80));
console.log();
console.log("# Server RSA Keys for QR Digital Signatures");
console.log(`SERVER_PRIVATE_KEY="${privateKeyOneLine}"`);
console.log();
console.log(`SERVER_PUBLIC_KEY="${publicKeyOneLine}"`);
console.log();
console.log("=".repeat(80));
console.log("IMPORTANT: Keep SERVER_PRIVATE_KEY secret! Never commit to git.");
console.log("=".repeat(80));
