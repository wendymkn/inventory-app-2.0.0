const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const machineId = arg("machine");
const businessName = arg("business") || "GlamStock Customer";
const type = arg("type") || "perpetual";
const expires = arg("expires");

if (!machineId) {
  console.error(
    'Usage: node tools/generate-license.cjs --machine "MACHINE_ID" --business "Bella Cosmetics" [--type perpetual|annual] [--expires 2027-09-30]'
  );
  process.exit(1);
}

if (!["perpetual", "annual"].includes(type)) {
  console.error('License type must be "perpetual" or "annual".');
  process.exit(1);
}

if (type === "annual" && !expires) {
  console.error("Annual licenses require --expires YYYY-MM-DD.");
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, "..");
const privateKeyPath = path.join(
  projectRoot,
  "developer-secrets",
  "glamstock-private.pem"
);

if (!fs.existsSync(privateKeyPath)) {
  console.error(
    "Private signing key not found. Run tools/generate-license-keys.cjs first."
  );
  process.exit(1);
}

const payload = {
  product: "GlamStock",
  machineId,
  businessName,
  licenseType: type,
  issuedAt: new Date().toISOString(),
  expiresAt:
    type === "annual"
      ? new Date(`${expires}T23:59:59.999Z`).toISOString()
      : null,
};

const payloadPart = Buffer.from(
  JSON.stringify(payload),
  "utf8"
).toString("base64url");

const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const signature = crypto.sign(
  null,
  Buffer.from(payloadPart, "utf8"),
  privateKey
);

const licenseCode =
  `${payloadPart}.${signature.toString("base64url")}`;

console.log("");
console.log("GLAMSTOCK ACTIVATION CODE");
console.log("-------------------------");
console.log(licenseCode);
console.log("");
console.log(`Business: ${businessName}`);
console.log(`Machine:  ${machineId}`);
console.log(`Type:     ${type}`);
console.log(`Expires:  ${payload.expiresAt || "Never"}`);
