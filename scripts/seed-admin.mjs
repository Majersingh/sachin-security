// scripts/seed-admin.mjs
// Creates the first admin login account and the unique indexes on the users collection.
// Run once after deploying the new auth. It is idempotent (won't duplicate an admin).
//
// Usage (Node 20+ loads .env.local via --env-file):
//   SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='StrongPass!23' \
//     node --env-file=.env.local scripts/seed-admin.mjs
//
// Or set SEED_ADMIN_* in .env.local and just run:
//   node --env-file=.env.local scripts/seed-admin.mjs
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const DB_NAME = process.env.DB_NAME || "sachin-security-01";
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-admin.mjs");
  process.exit(1);
}

const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || "";
const name = process.env.SEED_ADMIN_NAME || "Administrator";

if (!email || !password) {
  console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (env or .env.local) before running.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const users = client.db(DB_NAME).collection("users");

  // Unique (sparse) indexes so blank emails/employeeIds don't collide.
  await users.createIndex({ email: 1 }, { unique: true, sparse: true });
  await users.createIndex({ employeeId: 1 }, { unique: true, sparse: true });

  const existing = await users.findOne({ email });
  if (existing) {
    console.log(`Admin already exists for ${email} — nothing to do.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await users.insertOne({
      email,
      name,
      role: "admin",
      passwordHash,
      active: true,
      mustResetPassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Created admin account: ${email}`);
  }
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  await client.close();
}
