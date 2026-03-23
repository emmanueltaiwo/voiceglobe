import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("voiceglobe");
  await db
    .collection("messages")
    .createIndexes([
      { key: { expiresAt: 1 } },
      { key: { replyTo: 1 } },
      { key: { lat: 1, lng: 1 } },
      { key: { createdAt: 1 } },
      { key: { countryCode: 1 } },
    ]);
  await db
    .collection("reactions")
    .createIndexes([
      { key: { messageId: 1 } },
      { key: { messageId: 1, clientId: 1 } },
    ]);
  return db;
}
