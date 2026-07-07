import { MongoClient, type Db } from "mongodb";
import { SAAS_CONFIG } from "../config";

type TenantDatabaseInput = {
  id: string;
  slug: string;
};

let mongoClientPromise: Promise<MongoClient> | null = null;

function assertMongoConfigured() {
  if (!SAAS_CONFIG.mongoTenantUri) {
    throw new Error("SAAS_MONGODB_URI or MONGODB_URI is required for tenant databases");
  }
}

function getMongoClient() {
  assertMongoConfigured();

  if (!mongoClientPromise) {
    const client = new MongoClient(SAAS_CONFIG.mongoTenantUri, {
      maxPoolSize: 50,
      minPoolSize: 0,
    });
    mongoClientPromise = client.connect();
  }

  return mongoClientPromise;
}

function normalizeDatabasePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function tenantDatabaseName(tenant: TenantDatabaseInput) {
  const slug = normalizeDatabasePart(tenant.slug) || "gym";
  const idPart = normalizeDatabasePart(tenant.id).slice(0, 10);
  return `${SAAS_CONFIG.mongoTenantDatabasePrefix}_${slug}_${idPart}_db`;
}

export async function getPlatformDatabase() {
  const client = await getMongoClient();
  return client.db(SAAS_CONFIG.mongoPlatformDatabase);
}

export async function getTenantDatabase(tenant: TenantDatabaseInput): Promise<Db> {
  const client = await getMongoClient();
  return client.db(tenantDatabaseName(tenant));
}

export async function bootstrapTenantDatabase(tenant: TenantDatabaseInput) {
  const db = await getTenantDatabase(tenant);
  const now = new Date();

  await Promise.all([
    db.collection("members").createIndex({ email: 1 }, { sparse: true }),
    db.collection("members").createIndex({ phone: 1 }, { sparse: true }),
    db.collection("trainers").createIndex({ email: 1 }, { sparse: true }),
    db.collection("attendance").createIndex({ memberId: 1, checkInAt: -1 }),
    db.collection("payments").createIndex({ memberId: 1, paidAt: -1 }),
    db.collection("orders").createIndex({ memberId: 1, createdAt: -1 }),
    db.collection("notifications").createIndex({ memberId: 1, createdAt: -1 }),
    db.collection("workoutPlans").createIndex({ memberId: 1, createdAt: -1 }),
    db.collection("progress").createIndex({ memberId: 1, measuredAt: -1 }),
  ]);

  await db.collection("settings").updateOne(
    { key: "gymDefaults" },
    {
      $setOnInsert: {
        key: "gymDefaults",
        value: {
          timezone: "UTC",
          currency: "USD",
          attendanceMethod: "manual",
        },
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true }
  );

  await db.collection("categories").updateOne(
    { key: "defaultMemberCategories" },
    {
      $setOnInsert: {
        key: "defaultMemberCategories",
        values: ["General", "Personal Training", "VIP"],
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true }
  );

  return {
    databaseName: db.databaseName,
  };
}
