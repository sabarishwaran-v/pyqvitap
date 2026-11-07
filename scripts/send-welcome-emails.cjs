/**
 * PyqVitAp Welcome & Exam Digest Email Dispatcher
 * Sends personalized welcome emails via Cloudflare Email Sending API
 *
 * Usage:
 *   Test single email (does not update DB):
 *     node scripts/send-welcome-emails.cjs --test your.email@example.com
 *
 *   Send to all pending subscribers (updates DB, duplicate-proof):
 *     node scripts/send-welcome-emails.cjs --send-all
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Helper to load env vars from .env file
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return "";
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    if (line.startsWith(`${key}=`)) {
      return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

const CLOUDFLARE_ACCOUNT_ID = getEnv("CLOUDFLARE_ACCOUNT_ID") || "22f805545a052f50af20e03cbc8e7a30";
const CLOUDFLARE_API_TOKEN = getEnv("CLOUDFLARE_EMAIL_TOKEN");
const CF_EMAIL_API_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/sending/send`;

const SENDER = "PyqVitAp <welcome@pyqvitap.site>";
const SUBJECT = "Welcome to PyqVitAp! 🚀 Your Exam Vault is Ready";

// Read HTML template
const TEMPLATE_PATH = path.resolve(__dirname, "templates/welcome-digest.html");
const HTML_TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf-8");

// Load MONGODB_URI from .env
function getMongoUri() {
  return getEnv("MONGODB_URI");
}

// Generate personalized HTML with encoded unsubscribe link
function renderEmail(recipientEmail) {
  const encodedEmail = encodeURIComponent(recipientEmail);
  return HTML_TEMPLATE.replace(/{{email}}/g, encodedEmail);
}

// Plain text fallback
function renderPlainText(recipientEmail) {
  return `Welcome to PyqVitAp! 🚀

Hey fellow VIT-APian,

Thank you for subscribing to PyqVitAp! We’ve updated the platform with fresh papers, instant PDF previews, and zero lag so your exam prep is smooth.

🎯 Your Ultimate CAT & FAT Exam Vault:
Access verified previous year question papers organized by course code, slot, and semester. Spot recurring question patterns, test your prep, and walk into your exam hall with confidence.

Browse Question Papers: https://pyqvitap.site
Share with friends on WhatsApp: https://api.whatsapp.com/send?text=Hey%2C%20check%20out%20PyqVitAp%20for%20VIT-AP%20past%20year%20exam%20papers%20(CAT-1%2C%20CAT-2%2C%20FAT)%3A%20https%3A%2F%2Fpyqvitap.site

© 2026 PyqVitAp ~ Built by student for students ❤️
GitHub: https://github.com/sabarishwaran-v/pyqvitap
Buy Me a Coffee: https://buymeacoffee.com/sabarishwaran

To unsubscribe, visit: https://pyqvitap.site/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
}

// Sleep helper for polite sending rate
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Dispatch single email via Cloudflare REST API
async function sendEmail(toEmail, customSubject) {
  const payload = {
    to: toEmail,
    from: SENDER,
    subject: customSubject || SUBJECT,
    html: renderEmail(toEmail),
    text: renderPlainText(toEmail),
  };

  const res = await fetch(CF_EMAIL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(
      `Cloudflare API error (${res.status}): ${JSON.stringify(data.errors || data)}`
    );
  }

  return data.result;
}

// MongoDB schema
const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now },
    welcomeEmailSentAt: { type: Date, default: null },
  },
  { collection: "emailsubs" }
);

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    const testIndex = args.indexOf("--test");
    const testEmail = args[testIndex + 1];

    if (!testEmail || !testEmail.includes("@")) {
      console.error("❌ Please provide a valid email: node scripts/send-welcome-emails.cjs --test your@email.com");
      process.exit(1);
    }

    const testSubject = `${SUBJECT} [Preview ${Date.now().toString().slice(-4)}]`;
    console.log(`\n🚀 [TEST MODE] Sending test welcome email to: ${testEmail}`);
    console.log(`From:    ${SENDER}`);
    console.log(`Subject: ${testSubject}`);

    try {
      const result = await sendEmail(testEmail, testSubject);
      console.log(`\n✅ Test email successfully queued/delivered!`);
      console.log(`Message ID: ${result.message_id || "N/A"}`);
      console.log(`Queued to:  ${JSON.stringify(result.queued)}`);
      console.log(`\nPlease check your inbox at ${testEmail} to review the design and links.`);
    } catch (err) {
      console.error(`❌ Failed to send test email:`, err.message);
      process.exit(1);
    }
    return;
  }

  if (args.includes("--send-all")) {
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      console.error("❌ MONGODB_URI not found in environment or .env file.");
      process.exit(1);
    }

    console.log("\n📦 Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    const EmailSub = mongoose.model("EmailSubDispatcher", subscriberSchema);

    // Find subscribers who haven't received the welcome email yet
    const pendingSubscribers = await EmailSub.find({
      $or: [
        { welcomeEmailSentAt: { $exists: false } },
        { welcomeEmailSentAt: null },
      ],
    }).lean();

    const totalCount = await EmailSub.countDocuments();
    const pendingCount = pendingSubscribers.length;
    const alreadySentCount = totalCount - pendingCount;

    console.log(`\n📊 Subscribers Overview:`);
    console.log(`  - Total in Database:   ${totalCount}`);
    console.log(`  - Already Sent:        ${alreadySentCount}`);
    console.log(`  - Pending to Send:     ${pendingCount}`);

    if (pendingCount === 0) {
      console.log("\n✨ All subscribers have already received the welcome email! No actions needed.");
      await mongoose.disconnect();
      return;
    }

    console.log(`\n🚀 Starting batch dispatch to ${pendingCount} subscribers...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingSubscribers.length; i++) {
      const sub = pendingSubscribers[i];
      const indexStr = `[${i + 1}/${pendingCount}]`;

      try {
        const result = await sendEmail(sub.email);
        
        // Immediately record in DB to ensure idempotency / never send twice
        await EmailSub.updateOne(
          { _id: sub._id },
          { $set: { welcomeEmailSentAt: new Date() } }
        );

        console.log(`${indexStr} ✅ Sent to ${sub.email} (ID: ${result.message_id || "ok"})`);
        successCount++;
      } catch (err) {
        console.error(`${indexStr} ❌ Failed for ${sub.email}:`, err.message);
        failCount++;
      }

      // Polite 400ms delay between emails to maintain stellar reputation
      if (i < pendingSubscribers.length - 1) {
        await sleep(400);
      }
    }

    console.log(`\n🎉 Batch Dispatch Completed!`);
    console.log(`  - Successfully Sent: ${successCount}`);
    console.log(`  - Failed:            ${failCount}`);
    console.log(`  - Total Handled:     ${pendingCount}\n`);

    await mongoose.disconnect();
    return;
  }

  console.log(`
PyqVitAp Welcome Email CLI

Usage:
  node scripts/send-welcome-emails.cjs --test <email>
    Sends a test email to the specified address.

  node scripts/send-welcome-emails.cjs --send-all
    Dispatches to all pending subscribers in MongoDB.
`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
