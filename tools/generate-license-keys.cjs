const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..");
const secretsDir = path.join(projectRoot, "developer-secrets");
const privateKeyPath = path.join(secretsDir, "glamstock-private.pem");
const publicKeyPath = path.join(projectRoot, "electron", "license-public.pem");

fs.mkdirSync(secretsDir, { recursive: true });
fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });

if (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath)) {
  console.error("License keys already exist. Refusing to overwrite them.");
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

fs.writeFileSync(
  privateKeyPath,
  privateKey.export({ type: "pkcs8", format: "pem" }),
  "utf8"
);

fs.writeFileSync(
  publicKeyPath,
  publicKey.export({ type: "spki", format: "pem" }),
  "utf8"
);

console.log("GlamStock license key pair created.");
console.log(`PRIVATE KEY: ${privateKeyPath}`);
console.log(`PUBLIC KEY:  ${publicKeyPath}`);
console.log("");
console.log(
  "IMPORTANT: Back up the PRIVATE KEY somewhere safe. Never ship it with GlamStock."
);
