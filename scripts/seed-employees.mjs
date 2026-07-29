// scripts/seed-employees.mjs
// Seeds TEST employees whose shape exactly matches the add-employee form / POST /api/employees,
// plus a matching login account per employee (role: employee, temp password, must-reset).
// Profile images are NOT uploaded to R2 — profileUrl/profileFilename are stored as "##".
// Every seeded doc is tagged { isTest: true } so it can be removed cleanly.
//
// Usage (Node 20+):
//   node --env-file=.env.local scripts/seed-employees.mjs           # seed (default 55)
//   SEED_EMPLOYEE_COUNT=20 node --env-file=.env.local scripts/seed-employees.mjs
//   node --env-file=.env.local scripts/seed-employees.mjs clean     # delete all { isTest: true }
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const DB_NAME = process.env.DB_NAME || "sachin-security-01";
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-employees.mjs");
  process.exit(1);
}

const MODE = process.argv[2] === "clean" ? "clean" : "seed";
const COUNT = Math.max(1, parseInt(process.env.SEED_EMPLOYEE_COUNT || "55", 10) || 55);
const EMP_PASSWORD = process.env.SEED_EMP_PASSWORD || "Test@1234";
const MUST_RESET = (process.env.SEED_EMP_MUST_RESET || "true") !== "false";

// Cyclic sample data so filters/pagination have variety.
const FIRST = ["Amit", "Ravi", "Suresh", "Vijay", "Rahul", "Anil", "Deepak", "Manoj", "Sanjay", "Kiran", "Pooja", "Neha", "Priya", "Kavita", "Sunita"];
const LAST = ["Yadav", "Sharma", "Patel", "Singh", "Verma", "Chauhan", "Rana", "Solanki", "Rathod", "Mehta"];
const DEPARTMENTS = ["Operations", "Security", "Administration", "HR", "Finance"];
const DESIGNATIONS = ["Security Guard", "Head Guard", "Supervisor", "Gunman", "Bouncer", "Field Officer"];
const LOCATIONS = ["Vadodara", "Ahmedabad", "Surat", "Rajkot", "Gandhinagar"];
const STATES = ["Gujarat", "Maharashtra", "Rajasthan"];
const GENDERS = ["Male", "Female"];
const BLOOD = ["A+", "B+", "O+", "AB+", "O-"];
const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Bank of Baroda"];
const PINCODES = ["390007", "380001", "395003", "360001", "382010"];
const pick = (arr, i) => arr[i % arr.length];

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(DB_NAME);
  const employees = db.collection("employees");
  const users = db.collection("users");

  // Unique (sparse) indexes for login accounts.
  await users.createIndex({ email: 1 }, { unique: true, sparse: true });
  await users.createIndex({ employeeId: 1 }, { unique: true, sparse: true });

  if (MODE === "clean") {
    const e = await employees.deleteMany({ isTest: true });
    const u = await users.deleteMany({ isTest: true });
    console.log(`🧹 Removed ${e.deletedCount} test employees and ${u.deletedCount} test user accounts.`);
    process.exit(0);
  }

  // employeeId is auto-assigned as ss-<count+1>, matching the API.
  const startCount = await employees.countDocuments({});
  const passwordHash = await bcrypt.hash(EMP_PASSWORD, 10);
  const now = new Date();
  const created = [];

  for (let i = 0; i < COUNT; i++) {
    const n = startCount + i + 1;
    const employeeId = `ss-${n}`;
    const fullName = `${pick(FIRST, i)} ${pick(LAST, i + 3)}`;
    const email = `${employeeId}@test.local`;
    const aadharNumber = String(100000000000 + n); // 12 digits, unique
    const mobileNumber = String(9000000000 + n); // 10 digits

    const employeeData = {
      // Personal Information
      fullName,
      fatherName: `${pick(FIRST, i + 1)} ${pick(LAST, i + 3)}`,
      motherName: `${pick(FIRST, i + 9)} ${pick(LAST, i + 3)}`,
      profileFilename: "##",
      profileUrl: "##",
      isUploadedtoR2: false,
      dateOfBirth: `19${80 + (i % 20)}-0${(i % 9) + 1}-1${i % 9}`,
      gender: pick(GENDERS, i),
      bloodGroup: pick(BLOOD, i),
      maritalStatus: i % 2 === 0 ? "Single" : "Married",

      // Contact Information
      mobileNumber,
      alternateNumber: "",
      email,
      currentAddress: `${10 + i}, Test Street, ${pick(LOCATIONS, i)}`,
      permanentAddress: `${10 + i}, Test Street, ${pick(LOCATIONS, i)}`,
      city: pick(LOCATIONS, i),
      state: pick(STATES, i),
      pincode: pick(PINCODES, i),

      // Government IDs
      aadharNumber,
      panNumber: `ABCDE${String(1000 + n).slice(-4)}F`,

      // Employment Details
      employeeId,
      designation: pick(DESIGNATIONS, i),
      department: pick(DEPARTMENTS, i),
      joiningDate: `20${20 + (i % 6)}-0${(i % 9) + 1}-1${i % 9}`,
      employmentType: "Full-time",
      reportingManager: "",
      workLocation: pick(LOCATIONS, i),

      // Salary & Benefits
      basicSalary: String(12000 + (i % 10) * 1000),
      hra: String(4000 + (i % 5) * 500),
      otherAllowances: "1500",
      pfNumber: `PF${String(100000 + n)}`,
      esiNumber: `ESI${String(200000 + n)}`,
      uanNumber: `UAN${String(300000 + n)}`,

      // Bank Details
      bankName: pick(BANKS, i),
      accountNumber: String(500100200300 + n),
      ifscCode: `SBIN000${String(1000 + (i % 9))}`,
      branchName: `${pick(LOCATIONS, i)} Branch`,

      // Emergency Contact
      emergencyContactName: `${pick(FIRST, i + 5)} ${pick(LAST, i + 1)}`,
      emergencyContactNumber: String(8000000000 + n),
      emergencyContactRelation: i % 2 === 0 ? "Father" : "Spouse",

      status: "Active",
      isTest: true,
      createdAt: now,
      updatedAt: now,
    };

    // Skip if an employee with this Aadhar somehow exists (idempotent-ish).
    const dupe = await employees.findOne({ aadharNumber });
    if (dupe) continue;

    await employees.insertOne(employeeData);

    // Matching login account (skip if one already exists for this id/email).
    const existingUser = await users.findOne({ $or: [{ employeeId }, { email }] });
    if (!existingUser) {
      await users.insertOne({
        employeeId,
        email,
        name: fullName,
        role: "employee",
        passwordHash,
        active: true,
        mustResetPassword: MUST_RESET,
        isTest: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    created.push({ employeeId, email });
  }

  console.log(`✅ Seeded ${created.length} test employees (+ login accounts).`);
  console.log(`   Login with employeeId OR email, password: ${EMP_PASSWORD}${MUST_RESET ? "  (forced reset on first login)" : ""}`);
  if (created.length) {
    console.log(`   Examples: ${created.slice(0, 3).map((c) => c.employeeId).join(", ")} ...`);
  }
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  await client.close();
}
