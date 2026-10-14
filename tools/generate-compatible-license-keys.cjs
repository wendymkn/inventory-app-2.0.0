const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..");
const secretsDir = path.join(projectRoot, "developer-secrets");
const privateKeyPath = path.join(secretsDir, "glamstock-private.pem");
const publicKeyPath = path.join(projectRoot, "electron", "license-public.pem");

fs.mkdirSync(secretsDir, { recursive: true });
fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });

if (fs.existsSync(privateKeyPath)) {
  console.error("Private signing key already exists. Refusing to overwrite it.");
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

console.log("GlamStock signing keys created successfully.");
console.log(`Private key: ${privateKeyPath}`);
console.log(`Public key:  ${publicKeyPath}`);
console.log("IMPORTANT: Back up glamstock-private.pem somewhere safe. Never ship it with GlamStock.");
