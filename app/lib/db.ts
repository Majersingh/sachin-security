// lib/db.ts
import clientPromise from './mongodb';

// Set DB_NAME in .env.local (e.g. sachin-security-staging-01) while building.
// Defaults to the production DB so a deploy without DB_NAME is safe.
const DB_NAME = process.env.DB_NAME || "sachin-security-staging-01";

export async function getDatabase() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getCollection(collectionName: string) {
  const db = await getDatabase();
  return db.collection(collectionName);
}
