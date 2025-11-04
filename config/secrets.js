const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const client = new SecretManagerServiceClient();

// !! REPLACE THIS with your GCP Project Number
// You can find this on the home page of your GCP Console.
const projectNumber = "266490093553";

// This helper function fetches one secret
async function accessSecret(secretName) {
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${projectNumber}/secrets/${secretName}/versions/latest`,
    });
    return version.payload.data.toString("utf8");
  } catch (error) {
    console.error(`Error accessing secret ${secretName}:`, error);
    process.exit(1); // Exit if any secret is missing
  }
}

// This function fetches all secrets and loads them into process.env
async function loadSecrets() {
  console.log("Loading secrets from Secret Manager...");

  // We run all fetches in parallel
  const [mongoUri, jwtSecret, cldName, cldApiKey, cldApiSecret] =
    await Promise.all([
      accessSecret("MONGO_URL"),
      accessSecret("JWT_SECRET"),
      accessSecret("CLD_NAME"),
      accessSecret("CLD_API_KEY"),
      accessSecret("CLD_API_SECRET"),
    ]);

  // Now, we set them on process.env so the rest of your app can work
  process.env.MONGO_URL = mongoUri;
  process.env.JWT_SECRET = jwtSecret;
  process.env.CLD_NAME = cldName;
  process.env.CLD_API_KEY = cldApiKey;
  process.env.CLD_API_SECRET = cldApiSecret;

  // This isn't a secret, but we can set it here
  process.env.NODE_ENV = "production";

  console.log("All secrets loaded into process.env.");
}

module.exports = { loadSecrets };
