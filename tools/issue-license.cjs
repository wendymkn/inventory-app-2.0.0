const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

const stableStringify = (value) => JSON.stringify(canonicalize(value));

const installationId = getArg("installation");
const businessName = getArg("business") || "GlamStock Customer";
const licenseType = getArg("type") || "perpetual";
const expires = getArg("expires");

if (!installationId) {
  console.error('Usage: node tools\\issue-license.cjs --installation "GS-PC-..." --business "Bella Cosmetics" --type perpetual');
  process.exit(1);
}

if (!["perpetual", "annual"].includes(licenseType)) {
  console.error('License type must be "perpetual" or "annual".');
  process.exit(1);
}

if (licenseType === "annual" && !expires) {
  console.error("Annual licenses require --expires YYYY-MM-DD.");
  process.exit(1);
}

let expiresAt = null;
if (licenseType === "annual") {
  const parsed = Date.parse(`${expires}T23:59:59.999Z`);
  if (!Number.isFinite(parsed)) {
    console.error("Invalid expiry date. Use YYYY-MM-DD.");
    process.exit(1);
  }
  expiresAt = new Date(parsed).toISOString();
}

const projectRoot = path.resolve(__dirname, "..");
const privateKeyPath = path.join(projectRoot, "developer-secrets", "glamstock-private.pem");

if (!fs.existsSync(privateKeyPath)) {
  console.error("Private signing key not found:", privateKeyPath);
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const issuedAt = new Date().toISOString();
const licenseId = `GS-LIC-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

const payload = {
  product: "GlamStock",
  licenseVersion: 1,
  licenseId,
  installationId,
  businessName,
  licenseType,
  issuedAt,
  expiresAt,
};

const signature = crypto
  .sign(null, Buffer.from(stableStringify(payload)), privateKey)
  .toString("base64");

const licenseObject = { payload, signature };
const outputDirectory = path.join(projectRoot, "issued-licenses");
fs.mkdirSync(outputDirectory, { recursive: true });

const safeBusinessName = businessName
  .replace(/[^a-z0-9]+/gi, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase() || "customer";

const outputPath = path.join(
  outputDirectory,
  `${safeBusinessName}-${licenseId}.glamlicense.json`
);

fs.writeFileSync(outputPath, JSON.stringify(licenseObject, null, 2), "utf8");

console.log("GlamStock license issued successfully.");
console.log(`License ID:      ${licenseId}`);
console.log(`Business:        ${businessName}`);
console.log(`Installation ID: ${installationId}`);
console.log(`Type:            ${licenseType}`);
console.log(`Expires:         ${expiresAt || "Never"}`);
console.log(`Saved to:        ${outputPath}`);
