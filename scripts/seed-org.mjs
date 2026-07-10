// scripts/seed-org.mjs
// Seeds starter Organization Structure data (departments, designations, teams,
// branches, locations) so the /admin/organization UI has content immediately.
// Docs are tagged { seededOrg: true } for easy cleanup.
//
//   node --env-file=.env.local scripts/seed-org.mjs          # seed
//   node --env-file=.env.local scripts/seed-org.mjs clean    # remove seeded org data
import { MongoClient } from "mongodb";

const DB_NAME = process.env.DB_NAME || "sachin-security-01";
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const MODE = process.argv[2] === "clean" ? "clean" : "seed";
const now = () => new Date();

const DATA = {
  departments: [
    { name: "Operations", description: "Field operations and deployment" },
    { name: "Security", description: "Guarding and security services" },
    { name: "Administration", description: "Office administration" },
    { name: "HR", description: "Human resources" },
    { name: "Finance", description: "Accounts and payroll" },
  ],
  designations: [
    { title: "Security Guard", department: "Security", description: "" },
    { title: "Head Guard", department: "Security", description: "" },
    { title: "Supervisor", department: "Operations", description: "" },
    { title: "Gunman", department: "Security", description: "" },
    { title: "Field Officer", department: "Operations", description: "" },
    { title: "HR Executive", department: "HR", description: "" },
  ],
  branches: [
    { name: "Vadodara Head Office", code: "VAD-HO", address: "410, 411, Oneindiabulls, Jetalpur", city: "Vadodara", state: "Gujarat", pincode: "390007" },
    { name: "Ahmedabad Branch", code: "AMD-BR", address: "", city: "Ahmedabad", state: "Gujarat", pincode: "380001" },
  ],
  teams: [
    { name: "Alpha Squad", branch: "Vadodara Head Office", description: "Day shift patrol" },
    { name: "Bravo Squad", branch: "Vadodara Head Office", description: "Night shift patrol" },
  ],
  locations: [
    { name: "Inorbit Mall Site", code: "LOC-001", clientName: "Inorbit Malls", branch: "Vadodara Head Office", address: "", city: "Vadodara", state: "Gujarat" },
    { name: "TechPark Gate A", code: "LOC-002", clientName: "TechPark Ltd", branch: "Ahmedabad Branch", address: "", city: "Ahmedabad", state: "Gujarat" },
  ],
};

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(DB_NAME);

  if (MODE === "clean") {
    let total = 0;
    for (const coll of Object.keys(DATA)) {
      const r = await db.collection(coll).deleteMany({ seededOrg: true });
      total += r.deletedCount;
    }
    console.log(`🧹 Removed ${total} seeded org records from ${DB_NAME}.`);
    process.exit(0);
  }

  for (const [coll, rows] of Object.entries(DATA)) {
    const collection = db.collection(coll);
    for (const row of rows) {
      const displayKey = "name" in row ? "name" : "title";
      const existing = await collection.findOne({ [displayKey]: row[displayKey] });
      if (existing) continue;
      await collection.insertOne({ ...row, active: true, seededOrg: true, createdAt: now(), updatedAt: now() });
    }
    console.log(`  ${coll}: ${rows.length} ensured`);
  }
  console.log(`✅ Seeded starter org data into ${DB_NAME}.`);
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  await client.close();
}
