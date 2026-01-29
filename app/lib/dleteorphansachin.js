/**
 * Run with: node cleanup-orphan-uploads.js
 */

const { MongoClient, ObjectId } = require("mongodb");

// 🔧 HARD-CODE YOUR DB DETAILS HERE
const MONGO_URI = 'mongodb+srv://aniketrajput1809_db_user:yhdimL2tAApByOjQ@sachin-security-cluster.murvogz.mongodb.net/?appName=sachin-security-cluster-01'
const DB_NAME = "sachin-security-01";
const EMPLOYEES_COLLECTION = "employees";
const UPLOADS_COLLECTION = "uploads";

async function cleanupOrphanUploads() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const employeesCol = db.collection(EMPLOYEES_COLLECTION);
    const uploadsCol = db.collection(UPLOADS_COLLECTION);

    // 1️⃣ Get all profileUrl values
    const employees = await employeesCol
      .find(
        { profileUrl: { $exists: true } },
        { projection: { profileUrl: 1 } }
      )
      .toArray();

    const usedUploadIds = new Set();

    for (const emp of employees) {
      if (!emp.profileUrl) continue;

      const parts = emp.profileUrl.split("/");
      const lastPart = parts[parts.length - 1];

      if (ObjectId.isValid(lastPart)) {
        usedUploadIds.add(lastPart);
      }
    }

    console.log(`🔗 Uploads referenced by employees: ${usedUploadIds.size}`);

    // 2️⃣ Find orphan uploads
    const orphanUploads = await uploadsCol
      .find({
        _id: {
          $nin: Array.from(usedUploadIds).map(
            (id) => new ObjectId(id)
          ),
        },
      })
      .toArray();

    console.log(`🗑️ Orphan uploads found: ${orphanUploads.length}`);

    if (orphanUploads.length === 0) {
      console.log("🎉 Nothing to delete");
      return;
    }

    // 3️⃣ Delete ONLY from MongoDB uploads collection
    // const deleteResult = await uploadsCol.deleteMany({
    //   _id: { $in: orphanUploads.map((u) => u._id) },
    // });

    // console.log(`✅ Deleted ${deleteResult.deletedCount} orphan uploads`);

  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

// 🚀 RUN
cleanupOrphanUploads();
