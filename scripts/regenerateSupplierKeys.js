import prisma from "../config/database.js";
import { generateKeyPair, sha256Hash } from "../utils/crypto.js";
import fs from "fs";
import path from "path";

/**
 * Regenerate private key for a supplier
 * Usage: node scripts/regenerateSupplierKeys.js <supplierEmail>
 */

async function regenerateSupplierKeys() {
    const supplierEmail = process.argv[2];

    if (!supplierEmail) {
        console.error("Usage: node scripts/regenerateSupplierKeys.js <supplierEmail>");
        process.exit(1);
    }

    try {
        // Find supplier by email
        const user = await prisma.user.findUnique({
            where: { email: supplierEmail },
            include: { supplierProfile: true },
        });

        if (!user) {
            console.error(`User with email ${supplierEmail} not found`);
            process.exit(1);
        }

        if (!user.supplierProfile) {
            console.error(`User ${supplierEmail} is not a supplier`);
            process.exit(1);
        }

        // Generate new key pair
        const { publicKey, privateKey } = generateKeyPair();
        const privateKeyHash = sha256Hash(privateKey.trim());

        // Update supplier profile
        await prisma.supplierProfile.update({
            where: { id: user.supplierProfile.id },
            data: {
                publicKey,
                privateKeyHash,
            },
        });

        // Save private key to file
        const keyFileName = `supplier_${user.id}_private_key.pem`;
        const keyFilePath = path.join(process.cwd(), keyFileName);
        fs.writeFileSync(keyFilePath, privateKey);

        console.log("\n===========================================");
        console.log("✅ Keys regenerated successfully!");
        console.log("===========================================");
        console.log("\nSupplier:", user.name);
        console.log("Email:", user.email);
        console.log("\nPrivate Key Hash (stored in DB):");
        console.log(privateKeyHash);
        console.log("\n⚠️  IMPORTANT: Your private key has been saved to:");
        console.log(keyFilePath);
        console.log("\nCopy the key from this file and use it for order approval.");
        console.log("Delete this file after copying the key!\n");

        process.exit(0);
    } catch (error) {
        console.error("Error regenerating keys:", error);
        process.exit(1);
    }
}

regenerateSupplierKeys();
