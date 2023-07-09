import fs from "fs";
import path from "path";
import crypto from "crypto";

// Verify Directory
const outputDir = "./rsa-keys";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Gen RSA Keys (2048 bits)
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

// Create Archive
const privateKeyPath = path.join(outputDir, "private_key.pem");
const publicKeyPath = path.join(outputDir, "public_key.pem");

// Write Archive on System
fs.writeFileSync(
  privateKeyPath,
  privateKey.export({ type: "pkcs1", format: "pem" })
);
fs.writeFileSync(
  publicKeyPath,
  publicKey.export({ type: "pkcs1", format: "pem" })
);

console.log("Chaves geradas com sucesso!");
