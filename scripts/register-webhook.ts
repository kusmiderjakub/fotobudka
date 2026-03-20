// One-time script to register the Printbox webhook subscription
// Usage: npx tsx scripts/register-webhook.ts YOUR_VERCEL_DOMAIN
// Example: npx tsx scripts/register-webhook.ts fotobudka.vercel.app

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const BASE_URL = process.env.PRINTBOX_BASE_URL!;
const CLIENT_ID = process.env.PRINTBOX_CLIENT_ID!;
const CLIENT_SECRET = process.env.PRINTBOX_CLIENT_SECRET!;

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: npx tsx scripts/register-webhook.ts YOUR_VERCEL_DOMAIN");
  process.exit(1);
}

async function run() {
  // Get access token
  const tokenRes = await fetch(`${BASE_URL}/o/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Token request failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const { access_token } = await tokenRes.json();

  // Register webhook subscription
  const callbackUrl = `https://${domain}/api/webhooks/orders`;
  console.log("Registering webhook:", callbackUrl);

  const res = await fetch(`${BASE_URL}/api/ec/v4/subscriptions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      callback_url: callbackUrl,
      hooks: [{ model: "Order", events: ["updated"] }],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Failed:", res.status, data);
    process.exit(1);
  }

  console.log("Webhook registered successfully:", data);
}

run().catch(console.error);
