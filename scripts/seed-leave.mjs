// scripts/seed-leave.mjs
// Seeds starter leave types + holidays so the leave module has content.
// Tagged { seededLeave: true } for cleanup.
//   node --env-file=.env.local scripts/seed-leave.mjs
//   node --env-file=.env.local scripts/seed-leave.mjs clean
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME || "sachin-security-01";
const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

const MODE = process.argv[2] === "clean" ? "clean" : "seed";
const year = new Date().getFullYear();
const now = () => new Date();

const LEAVE_TYPES = [
  { name: "Casual Leave", code: "CL", annualQuota: 12, paid: true },
  { name: "Sick Leave", code: "SL", annualQuota: 8, paid: true },
  { name: "Earned Leave", code: "EL", annualQuota: 15, paid: true },
  { name: "Leave Without Pay", code: "LWP", annualQuota: 0, paid: false },
];

const HOLIDAYS = [
  { date: `${year}-01-26`, name: "Republic Day" },
  { date: `${year}-08-15`, name: "Independence Day" },
  { date: `${year}-10-02`, name: "Gandhi Jayanti" },
  { date: `${year}-11-01`, name: "Diwali" },
  { date: `${year}-12-25`, name: "Christmas" },
];

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(DB_NAME);
  const types = db.collection("leaveTypes");
  const holidays = db.collection("holidays");
  await holidays.createIndex({ date: 1 }, { unique: true });

  if (MODE === "clean") {
    const t = await types.deleteMany({ seededLeave: true });
    const h = await holidays.deleteMany({ seededLeave: true });
    console.log(`🧹 Removed ${t.deletedCount} leave types and ${h.deletedCount} holidays from ${DB_NAME}.`);
    process.exit(0);
  }

  for (const t of LEAVE_TYPES) {
    if (await types.findOne({ name: t.name })) continue;
    await types.insertOne({ ...t, active: true, seededLeave: true, createdAt: now(), updatedAt: now() });
  }
  for (const h of HOLIDAYS) {
    if (await holidays.findOne({ date: h.date })) continue;
    await holidays.insertOne({ ...h, active: true, seededLeave: true, createdAt: now(), updatedAt: now() });
  }
  console.log(`✅ Seeded ${LEAVE_TYPES.length} leave types and ${HOLIDAYS.length} holidays into ${DB_NAME}.`);
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  await client.close();
}
