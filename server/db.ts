
import { MongoClient, MongoServerError, type Collection, type Db, type Document } from "mongodb";
import { ENV } from "./_core/env";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type InsertUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
  lastSignedIn?: Date;
};

type TrainerDoc = {
  _id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  salary?: string | null;
  commissionRate?: string | null;
  performanceNotes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TraineeDoc = {
  _id: number;
  userId?: number | null;
  trainerId?: number | null;
  fullName: string;
  profileImage?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "other" | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  height?: string | null;
  weight?: string | null;
  bodyFat?: string | null;
  goal?: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | null;
  medicalNotes?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  notes?: string | null;
  isActive: boolean;
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

type SubscriptionPlanDoc = {
  _id: number;
  name: string;
  type: "monthly" | "quarterly" | "half_year" | "yearly" | "custom";
  durationDays: number;
  price: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SubscriptionDoc = {
  _id: number;
  traineeId: number;
  planId?: number | null;
  planName?: string | null;
  price: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "expired" | "frozen" | "cancelled" | "pending";
  renewalCount: number;
  frozenDays: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PaymentDoc = {
  _id: number;
  traineeId: number;
  subscriptionId?: number | null;
  supplementOrderId?: number | null;
  amount: string;
  discount?: string | null;
  finalAmount: string;
  paymentMethod: "cash" | "card" | "wallet" | "transfer";
  paymentDate: Date;
  receiptNumber?: string | null;
  notes?: string | null;
  type: "subscription" | "supplement" | "other";
  createdAt: Date;
  updatedAt: Date;
};

type WorkoutPlanDoc = {
  _id: number;
  name: string;
  goal?: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | null;
  description?: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type WorkoutDayDoc = {
  _id: number;
  planId: number;
  dayName: string;
  dayOrder: number;
  category: "chest" | "back" | "shoulders" | "arms" | "legs" | "abs" | "cardio" | "full_body" | "rest";
  createdAt: Date;
};

type ExerciseDoc = {
  _id: number;
  dayId: number;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restTime?: string | null;
  instructions?: string[] | null;
  notes?: string | null;
  demoUrl?: string | null;
  gifUrl?: string | null;
  bodyPart?: string | null;
  target?: string | null;
  equipment?: string | null;
  orderIndex: number;
  createdAt: Date;
};

type TraineeWorkoutAssignmentDoc = {
  _id: number;
  traineeId: number;
  planId: number;
  assignedAt: Date;
  isActive: boolean;
};

type ExerciseCompletionDoc = {
  _id: number;
  traineeId: number;
  exerciseId: number;
  completedAt: Date;
  notes?: string | null;
};

type ProgressRecordDoc = {
  _id: number;
  traineeId: number;
  recordDate: Date;
  weight?: string | null;
  height?: string | null;
  bodyFat?: string | null;
  chest?: string | null;
  waist?: string | null;
  arm?: string | null;
  thigh?: string | null;
  bmi?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt: Date;
};

type AttendanceDoc = {
  _id: number;
  traineeId: number;
  checkInDate: Date;
  checkInTime: Date;
  status: "present" | "absent" | "late";
  notes?: string | null;
  createdAt: Date;
};

type SupplementCategoryDoc = {
  _id: number;
  name: string;
  description?: string | null;
  createdAt: Date;
};

type SupplementDoc = {
  _id: number;
  categoryId?: number | null;
  name: string;
  description?: string | null;
  price: string;
  discountPrice?: string | null;
  stock: number;
  sku?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SupplementOrderDoc = {
  _id: number;
  traineeId: number;
  totalAmount: string;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  paymentId?: number | null;
  paymentMethod?: "cash" | "card" | "wallet" | "transfer" | null;
  paidAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SupplementOrderItemDoc = {
  _id: number;
  orderId: number;
  supplementId: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: Date;
};

type NutritionGoal = "weight_loss" | "muscle_gain" | "maintenance" | "cutting" | "bulking";
type NutritionMealName = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Pre-Workout" | "Post-Workout";
type NutritionUnit = "grams" | "ml" | "pieces" | "cups";
type NutritionAssignmentStatus = "active" | "completed" | "paused";

type NutritionPlanDoc = {
  _id: number;
  name: string;
  description?: string | null;
  goal: NutritionGoal;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdBy?: number | null;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type NutritionMealDoc = {
  _id: number;
  planId: number;
  mealName: NutritionMealName;
  mealOrder: number;
  totalCalories: number;
  createdAt: Date;
  updatedAt: Date;
};

type NutritionFoodDoc = {
  _id: number;
  mealId: number;
  foodName: string;
  quantity: number;
  unit: NutritionUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type NutritionAssignmentDoc = {
  _id: number;
  planId: number;
  traineeId: number;
  startDate: Date;
  endDate: Date;
  status: NutritionAssignmentStatus;
  notes?: string | null;
  assignedBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type MarketingCampaignDoc = {
  _id: number;
  title: string;
  message: string;
  targetAudience: "all" | "active" | "expired" | "by_plan" | "by_goal";
  targetPlanId?: number | null;
  targetGoal?: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | null;
  channel: "in_app" | "sms" | "whatsapp" | "email" | "telegram" | "both";
  status: "draft" | "scheduled" | "sent" | "cancelled";
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  recipientCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type NotificationDoc = {
  _id: number;
  userId?: number | null;
  traineeId?: number | null;
  title: string;
  message: string;
  type:
    | "subscription_expiring"
    | "subscription_expired"
    | "payment_confirmed"
    | "new_workout"
    | "offer"
    | "low_stock"
    | "new_order"
    | "new_trainee"
    | "attendance_reminder"
    | "general";
  isRead: boolean;
  createdAt: Date;
};

type MessageTemplateDoc = {
  _id: number;
  name: string;
  content: string;
  category?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CounterDoc = { _id: string; seq: number };

type UserDoc = {
  _id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

let client: MongoClient | null = null;
let cachedDb: Db | null = null;
async function getDb(): Promise<Db | null> {
  if (cachedDb) return cachedDb;
  if (!ENV.mongoUri || !ENV.mongoDb) {
    console.warn("[Database] MongoDB is not configured");
    return null;
  }

  if (!client) {
    client = new MongoClient(ENV.mongoUri);
  }

  await client.connect();

  cachedDb = client.db(ENV.mongoDb);
  return cachedDb;
}

async function getCollection<T extends Document>(name: string): Promise<Collection<T> | null> {
  const db = await getDb();
  if (!db) return null;
  return db.collection<T>(name);
}

async function getNextId(collectionName: string): Promise<number> {
  const counters = await getCollection<CounterDoc>("counters");
  if (!counters) throw new Error("DB not available");
  const counter = await counters.findOneAndUpdate(
    { _id: collectionName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter?.seq ?? 1;
}

function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function mapDoc<T extends { _id: number }>(doc: T | null): (Omit<T, "_id"> & { id: number }) | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  return { id: _id, ...(rest as Omit<T, "_id">) };
}

function mapDocs<T extends { _id: number }>(docs: T[]): Array<Omit<T, "_id"> & { id: number }> {
  return docs.map((doc) => mapDoc(doc)!) as Array<Omit<T, "_id"> & { id: number }>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapUserDoc(doc: UserDoc | null): User | undefined {
  if (!doc) return undefined;
  return {
    id: doc._id,
    openId: doc.openId,
    name: doc.name,
    email: doc.email,
    loginMethod: doc.loginMethod,
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastSignedIn: doc.lastSignedIn,
  };
}

// ===================== USERS =====================
export async function upsertUser(user: InsertUser): Promise<User> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const users = await getCollection<UserDoc>("users");
  if (!users) throw new Error("DB not available");

  const now = new Date();
  const role = user.role ?? (user.openId === ENV.ownerAuthId ? "admin" : "user");
  const existing = await users.findOne({ openId: user.openId });

  if (existing) {
    const update: Partial<UserDoc> = {
      updatedAt: now,
    };
    if (user.name !== undefined) update.name = user.name ?? null;
    if (user.email !== undefined) update.email = user.email ?? null;
    if (user.loginMethod !== undefined) update.loginMethod = user.loginMethod ?? null;
    if (user.lastSignedIn !== undefined) update.lastSignedIn = user.lastSignedIn;
    if (user.role !== undefined) update.role = user.role;
    if (!update.lastSignedIn) update.lastSignedIn = now;

    await users.updateOne({ _id: existing._id }, { $set: update });
    const updated = { ...existing, ...update } as UserDoc;
    return mapUserDoc(updated)!;
  }

  const id = await getNextId("users");
  const doc: UserDoc = {
    _id: id,
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn ?? now,
  };
  await users.insertOne(doc);
  return mapUserDoc(doc)!;
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const users = await getCollection<UserDoc>("users");
  if (!users) return undefined;
  const doc = await users.findOne({ openId });
  return mapUserDoc(doc);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getCollection<UserDoc>("users");
  if (!users) return undefined;
  const normalizedEmail = normalizeEmail(email);
  const doc = await users.findOne({ email: normalizedEmail });
  return mapUserDoc(doc);
}

export async function getUserById(id: number): Promise<User | undefined> {
  const users = await getCollection<UserDoc>("users");
  if (!users) return undefined;
  const doc = await users.findOne({ _id: id });
  return mapUserDoc(doc);
}

export async function getUsersByRole(role: "user" | "admin"): Promise<User[]> {
  const users = await getCollection<UserDoc>("users");
  if (!users) return [];
  const docs = await users.find({ role }).sort({ createdAt: 1 }).toArray();
  return docs.map((doc) => mapUserDoc(doc)).filter((doc): doc is User => Boolean(doc));
}

export async function touchUserLastSignedIn(id: number): Promise<void> {
  const users = await getCollection<UserDoc>("users");
  if (!users) return;
  await users.updateOne({ _id: id }, { $set: { lastSignedIn: new Date(), updatedAt: new Date() } });
}

export async function upsertLocalUserCredentials(input: {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: "user" | "admin";
}): Promise<User> {
  const users = await getCollection<UserDoc>("users");
  if (!users) throw new Error("DB not available");
  const now = new Date();
  const email = normalizeEmail(input.email);
  const localOpenId = `local:${email}`;
  const existing = await users.findOne({
    $or: [{ email }, { openId: localOpenId }],
  });

  if (existing) {
    const update: Partial<UserDoc> = {
      email,
      loginMethod: "local",
      passwordHash: input.passwordHash,
      updatedAt: now,
    };
    if (input.name !== undefined) update.name = input.name ?? null;
    if (input.role !== undefined) update.role = input.role;
    await users.updateOne({ _id: existing._id }, { $set: update });
    const updated = { ...existing, ...update } as UserDoc;
    return mapUserDoc(updated)!;
  }

  const doc: UserDoc = {
    _id: await getNextId("users"),
    openId: localOpenId,
    name: input.name ?? null,
    email,
    loginMethod: "local",
    role: input.role ?? "user",
    passwordHash: input.passwordHash,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
  await users.insertOne(doc);
  return mapUserDoc(doc)!;
}

export async function getLocalAuthUserByEmail(email: string): Promise<{ user: User; passwordHash: string } | undefined> {
  const users = await getCollection<UserDoc>("users");
  if (!users) return undefined;
  const normalizedEmail = normalizeEmail(email);
  const doc = await users.findOne({
    $or: [{ email: normalizedEmail }, { openId: `local:${normalizedEmail}` }],
  });
  if (!doc?.passwordHash) return undefined;
  const user = mapUserDoc(doc);
  if (!user) return undefined;
  return { user, passwordHash: doc.passwordHash };
}
// ===================== TRAINERS =====================
export async function getTrainers(isActive?: boolean) {
  const trainers = await getCollection<TrainerDoc>("trainers");
  if (!trainers) return [];
  const filter: Partial<TrainerDoc> = {};
  if (isActive !== undefined) filter.isActive = isActive;
  const data = await trainers.find(filter).sort({ name: 1 }).toArray();
  return mapDocs(data);
}

export async function getTrainerById(id: number) {
  const trainers = await getCollection<TrainerDoc>("trainers");
  if (!trainers) return undefined;
  const doc = await trainers.findOne({ _id: id });
  return mapDoc(doc);
}

export async function createTrainer(data: {
  name: string;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  salary?: string | null;
  commissionRate?: string | null;
  performanceNotes?: string | null;
  isActive?: boolean;
}) {
  const trainers = await getCollection<TrainerDoc>("trainers");
  if (!trainers) throw new Error("DB not available");
  const now = new Date();
  const doc: TrainerDoc = {
    _id: await getNextId("trainers"),
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    specialty: data.specialty ?? null,
    salary: data.salary ?? null,
    commissionRate: data.commissionRate ?? null,
    performanceNotes: data.performanceNotes ?? null,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await trainers.insertOne(doc);
  return mapDoc(doc);
}

export async function updateTrainer(id: number, data: Partial<Omit<TrainerDoc, "_id" | "createdAt" | "updatedAt">>) {
  const trainers = await getCollection<TrainerDoc>("trainers");
  if (!trainers) throw new Error("DB not available");
  await trainers.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteTrainer(id: number) {
  const trainers = await getCollection<TrainerDoc>("trainers");
  if (!trainers) throw new Error("DB not available");
  return trainers.deleteOne({ _id: id });
}

// ===================== TRAINEES =====================
export async function getTrainees(opts?: { search?: string; isActive?: boolean; goal?: string; trainerId?: number; limit?: number; offset?: number }) {
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!trainees) return { data: [], total: 0 };
  const filter: Record<string, unknown> = {};
  if (opts?.isActive !== undefined) filter.isActive = opts.isActive;
  if (opts?.goal) filter.goal = opts.goal;
  if (opts?.trainerId) filter.trainerId = opts.trainerId;
  if (opts?.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ fullName: regex }, { phone: regex }, { email: regex }];
  }

  const [data, total] = await Promise.all([
    trainees
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    trainees.countDocuments(filter),
  ]);

  return { data: mapDocs(data), total };
}

export async function getTraineeById(id: number) {
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!trainees) return undefined;
  const doc = await trainees.findOne({ _id: id });
  return mapDoc(doc);
}

export async function getTraineeByUserId(userId: number) {
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!trainees) return undefined;
  const doc = await trainees.findOne({ userId });
  return mapDoc(doc);
}

export async function createTrainee(data: {
  fullName: string;
  userId?: number | null;
  trainerId?: number | null;
  profileImage?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "other" | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  height?: string | null;
  weight?: string | null;
  bodyFat?: string | null;
  goal?: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | null;
  medicalNotes?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  joinDate?: string | Date | null;
}) {
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!trainees) throw new Error("DB not available");
  const now = new Date();
  const doc: TraineeDoc = {
    _id: await getNextId("trainees"),
    userId: data.userId ?? null,
    trainerId: data.trainerId ?? null,
    fullName: data.fullName,
    profileImage: data.profileImage ?? null,
    age: data.age ?? null,
    gender: data.gender ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    height: data.height ?? null,
    weight: data.weight ?? null,
    bodyFat: data.bodyFat ?? null,
    goal: data.goal ?? null,
    medicalNotes: data.medicalNotes ?? null,
    emergencyContact: data.emergencyContact ?? null,
    emergencyPhone: data.emergencyPhone ?? null,
    notes: data.notes ?? null,
    isActive: data.isActive ?? true,
    joinDate: toDate(data.joinDate) ?? now,
    createdAt: now,
    updatedAt: now,
  };
  await trainees.insertOne(doc);
  return mapDoc(doc);
}

export async function updateTrainee(id: number, data: Partial<Omit<TraineeDoc, "_id" | "createdAt" | "updatedAt">>) {
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!trainees) throw new Error("DB not available");
  await trainees.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteTrainee(id: number) {
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!trainees) throw new Error("DB not available");
  return trainees.deleteOne({ _id: id });
}
// ===================== SUBSCRIPTIONS =====================
export async function getSubscriptionPlans() {
  const plans = await getCollection<SubscriptionPlanDoc>("subscription_plans");
  if (!plans) return [];
  const data = await plans.find({ isActive: true }).sort({ durationDays: 1 }).toArray();
  return mapDocs(data);
}

export async function getSubscriptions(opts?: { traineeId?: number; status?: string; limit?: number; offset?: number }) {
  const subs = await getCollection<SubscriptionDoc>("subscriptions");
  if (!subs) return { data: [], total: 0 };
  const filter: Record<string, unknown> = {};
  if (opts?.traineeId) filter.traineeId = opts.traineeId;
  if (opts?.status) filter.status = opts.status;

  const [data, total] = await Promise.all([
    subs
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    subs.countDocuments(filter),
  ]);

  return { data: mapDocs(data), total };
}

export async function getActiveSubscriptionByTraineeId(traineeId: number) {
  const subs = await getCollection<SubscriptionDoc>("subscriptions");
  if (!subs) return undefined;
  const doc = await subs.findOne({ traineeId, status: "active" });
  return mapDoc(doc);
}

export async function getSubscriptionById(id: number) {
  const subs = await getCollection<SubscriptionDoc>("subscriptions");
  if (!subs) return undefined;
  const doc = await subs.findOne({ _id: id });
  return mapDoc(doc);
}

export async function createSubscription(data: Omit<SubscriptionDoc, "_id" | "createdAt" | "updatedAt">) {
  const subs = await getCollection<SubscriptionDoc>("subscriptions");
  if (!subs) throw new Error("DB not available");
  const now = new Date();
  const doc: SubscriptionDoc = {
    _id: await getNextId("subscriptions"),
    traineeId: data.traineeId,
    planId: data.planId ?? null,
    planName: data.planName ?? null,
    price: data.price,
    startDate: toDate(data.startDate) ?? now,
    endDate: toDate(data.endDate) ?? now,
    status: data.status ?? "active",
    renewalCount: data.renewalCount ?? 0,
    frozenDays: data.frozenDays ?? 0,
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await subs.insertOne(doc);
  return mapDoc(doc);
}

export async function updateSubscription(id: number, data: Partial<Omit<SubscriptionDoc, "_id" | "createdAt" | "updatedAt">>) {
  const subs = await getCollection<SubscriptionDoc>("subscriptions");
  if (!subs) throw new Error("DB not available");
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.startDate) update.startDate = toDate(data.startDate);
  if (data.endDate) update.endDate = toDate(data.endDate);
  await subs.updateOne({ _id: id }, { $set: update });
}

export async function createSubscriptionPlan(data: {
  name: string;
  type: "monthly" | "quarterly" | "half_year" | "yearly" | "custom";
  durationDays: number;
  price: string;
  description?: string | null;
  isActive?: boolean;
}) {
  const plans = await getCollection<SubscriptionPlanDoc>("subscription_plans");
  if (!plans) throw new Error("DB not available");
  const now = new Date();
  const doc: SubscriptionPlanDoc = {
    _id: await getNextId("subscription_plans"),
    name: data.name,
    type: data.type,
    durationDays: data.durationDays,
    price: data.price,
    description: data.description ?? null,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await plans.insertOne(doc);
  return mapDoc(doc);
}

export async function updateSubscriptionPlan(id: number, data: Partial<Omit<SubscriptionPlanDoc, "_id" | "createdAt" | "updatedAt">>) {
  const plans = await getCollection<SubscriptionPlanDoc>("subscription_plans");
  if (!plans) throw new Error("DB not available");
  await plans.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
}

// ===================== PAYMENTS =====================
export async function getPayments(opts?: { traineeId?: number; type?: string; method?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }) {
  const payments = await getCollection<PaymentDoc>("payments");
  if (!payments) return { data: [], total: 0 };
  const filter: Record<string, unknown> = {};
  if (opts?.traineeId) filter.traineeId = opts.traineeId;
  if (opts?.type) filter.type = opts.type;
  if (opts?.method) filter.paymentMethod = opts.method;
  if (opts?.startDate || opts?.endDate) {
    filter.paymentDate = {
      ...(opts?.startDate ? { $gte: opts.startDate } : {}),
      ...(opts?.endDate ? { $lte: opts.endDate } : {}),
    };
  }

  const [data, total] = await Promise.all([
    payments
      .find(filter)
      .sort({ paymentDate: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    payments.countDocuments(filter),
  ]);

  return { data: mapDocs(data), total };
}

export async function createPayment(data: Omit<PaymentDoc, "_id" | "createdAt" | "updatedAt">) {
  const payments = await getCollection<PaymentDoc>("payments");
  if (!payments) throw new Error("DB not available");
  const now = new Date();
  const doc: PaymentDoc = {
    _id: await getNextId("payments"),
    traineeId: data.traineeId,
    subscriptionId: data.subscriptionId ?? null,
    supplementOrderId: data.supplementOrderId ?? null,
    amount: data.amount,
    discount: data.discount ?? "0",
    finalAmount: data.finalAmount,
    paymentMethod: data.paymentMethod,
    paymentDate: toDate(data.paymentDate) ?? now,
    receiptNumber: data.receiptNumber ?? null,
    notes: data.notes ?? null,
    type: data.type ?? "subscription",
    createdAt: now,
    updatedAt: now,
  };
  await payments.insertOne(doc);
  return mapDoc(doc);
}

export async function updatePayment(id: number, data: Partial<Omit<PaymentDoc, "_id" | "createdAt" | "updatedAt">>) {
  const payments = await getCollection<PaymentDoc>("payments");
  if (!payments) throw new Error("DB not available");
  await payments.updateOne({
    _id: id,
  }, {
    $set: {
      ...data,
      ...(data.paymentDate ? { paymentDate: toDate(data.paymentDate) ?? new Date(data.paymentDate) } : {}),
      updatedAt: new Date(),
    },
  });
}

export async function deletePayment(id: number) {
  const payments = await getCollection<PaymentDoc>("payments");
  if (!payments) throw new Error("DB not available");
  return payments.deleteOne({ _id: id });
}

export async function getRevenueStats() {
  const payments = await getCollection<PaymentDoc>("payments");
  if (!payments) return { total: 0, monthly: 0 };
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAgg, monthlyAgg] = await Promise.all([
    payments
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$finalAmount" } },
          },
        },
      ])
      .toArray(),
    payments
      .aggregate([
        { $match: { paymentDate: { $gte: startOfMonth } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$finalAmount" } },
          },
        },
      ])
      .toArray(),
  ]);

  return {
    total: Number(totalAgg[0]?.total ?? 0),
    monthly: Number(monthlyAgg[0]?.total ?? 0),
  };
}

export async function getMonthlyRevenue(months = 6) {
  const payments = await getCollection<PaymentDoc>("payments");
  if (!payments) return [];
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  const result = await payments
    .aggregate([
      { $match: { paymentDate: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } },
          revenue: { $sum: { $toDouble: "$finalAmount" } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: "$_id", revenue: 1 } },
    ])
    .toArray();

  return result as Array<{ month: string; revenue: number }>;
}
// ===================== WORKOUT PLANS =====================
export async function getWorkoutPlans(opts?: { isArchived?: boolean; goal?: string }) {
  const plans = await getCollection<WorkoutPlanDoc>("workout_plans");
  if (!plans) return [];
  const filter: Record<string, unknown> = {};
  if (opts?.isArchived !== undefined) filter.isArchived = opts.isArchived;
  if (opts?.goal) filter.goal = opts.goal;
  const data = await plans.find(filter).sort({ createdAt: -1 }).toArray();
  return mapDocs(data);
}

export async function getWorkoutPlanById(id: number) {
  const plans = await getCollection<WorkoutPlanDoc>("workout_plans");
  if (!plans) return undefined;
  const doc = await plans.findOne({ _id: id });
  return mapDoc(doc);
}

export async function getWorkoutDaysByPlanId(planId: number) {
  const days = await getCollection<WorkoutDayDoc>("workout_days");
  if (!days) return [];
  const data = await days.find({ planId }).sort({ dayOrder: 1 }).toArray();
  return mapDocs(data);
}

export async function getExercisesByDayId(dayId: number) {
  const exercises = await getCollection<ExerciseDoc>("exercises");
  if (!exercises) return [];
  const data = await exercises.find({ dayId }).sort({ orderIndex: 1 }).toArray();
  return mapDocs(data);
}

export async function createWorkoutPlan(data: {
  name: string;
  goal?: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | null;
  description?: string | null;
  isActive?: boolean;
  isArchived?: boolean;
}) {
  const plans = await getCollection<WorkoutPlanDoc>("workout_plans");
  if (!plans) throw new Error("DB not available");
  const now = new Date();
  const doc: WorkoutPlanDoc = {
    _id: await getNextId("workout_plans"),
    name: data.name,
    goal: data.goal ?? null,
    description: data.description ?? null,
    isActive: data.isActive ?? true,
    isArchived: data.isArchived ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await plans.insertOne(doc);
  return mapDoc(doc);
}

export async function updateWorkoutPlan(id: number, data: Partial<Omit<WorkoutPlanDoc, "_id" | "createdAt" | "updatedAt">>) {
  const plans = await getCollection<WorkoutPlanDoc>("workout_plans");
  if (!plans) throw new Error("DB not available");
  await plans.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function createWorkoutDay(data: Omit<WorkoutDayDoc, "_id" | "createdAt">) {
  const days = await getCollection<WorkoutDayDoc>("workout_days");
  if (!days) throw new Error("DB not available");
  const doc: WorkoutDayDoc = {
    _id: await getNextId("workout_days"),
    planId: data.planId,
    dayName: data.dayName,
    dayOrder: data.dayOrder ?? 0,
    category: data.category,
    createdAt: new Date(),
  };
  await days.insertOne(doc);
  return mapDoc(doc);
}

export async function createExercise(data: Omit<ExerciseDoc, "_id" | "createdAt">) {
  const exercises = await getCollection<ExerciseDoc>("exercises");
  if (!exercises) throw new Error("DB not available");
  const doc: ExerciseDoc = {
    _id: await getNextId("exercises"),
    dayId: data.dayId,
    name: data.name,
    sets: data.sets ?? null,
    reps: data.reps ?? null,
    restTime: data.restTime ?? null,
    instructions: data.instructions ?? null,
    notes: data.notes ?? null,
    demoUrl: data.demoUrl ?? null,
    gifUrl: data.gifUrl ?? null,
    bodyPart: data.bodyPart ?? null,
    target: data.target ?? null,
    equipment: data.equipment ?? null,
    orderIndex: data.orderIndex ?? 0,
    createdAt: new Date(),
  };
  await exercises.insertOne(doc);
  return mapDoc(doc);
}

export async function updateExercise(id: number, data: Partial<Omit<ExerciseDoc, "_id" | "createdAt">>) {
  const exercises = await getCollection<ExerciseDoc>("exercises");
  if (!exercises) throw new Error("DB not available");
  await exercises.updateOne({ _id: id }, { $set: { ...data } });
}

export async function deleteExercise(id: number) {
  const exercises = await getCollection<ExerciseDoc>("exercises");
  if (!exercises) throw new Error("DB not available");
  return exercises.deleteOne({ _id: id });
}

export async function deleteWorkoutDay(id: number) {
  const days = await getCollection<WorkoutDayDoc>("workout_days");
  const exercises = await getCollection<ExerciseDoc>("exercises");
  if (!days || !exercises) throw new Error("DB not available");
  await exercises.deleteMany({ dayId: id });
  return days.deleteOne({ _id: id });
}

export async function assignWorkoutPlan(traineeId: number, planId: number) {
  const assignments = await getCollection<TraineeWorkoutAssignmentDoc>("trainee_workout_assignments");
  if (!assignments) throw new Error("DB not available");
  await assignments.updateMany({ traineeId }, { $set: { isActive: false } });
  const doc: TraineeWorkoutAssignmentDoc = {
    _id: await getNextId("trainee_workout_assignments"),
    traineeId,
    planId,
    assignedAt: new Date(),
    isActive: true,
  };
  await assignments.insertOne(doc);
  return mapDoc(doc);
}

export async function getTraineeWorkoutPlan(traineeId: number) {
  const assignments = await getCollection<TraineeWorkoutAssignmentDoc>("trainee_workout_assignments");
  if (!assignments) return undefined;
  const active = await assignments.findOne({ traineeId, isActive: true });
  if (!active) return undefined;
  return getWorkoutPlanById(active.planId);
}

export async function toggleExerciseCompletion(traineeId: number, exerciseId: number) {
  const completions = await getCollection<ExerciseCompletionDoc>("exercise_completions");
  if (!completions) throw new Error("DB not available");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await completions.findOne({ traineeId, exerciseId, completedAt: { $gte: today } });
  if (existing) {
    await completions.deleteOne({ _id: existing._id });
    return false;
  }
  const doc: ExerciseCompletionDoc = {
    _id: await getNextId("exercise_completions"),
    traineeId,
    exerciseId,
    completedAt: new Date(),
  };
  await completions.insertOne(doc);
  return true;
}

export async function getTodayCompletions(traineeId: number) {
  const completions = await getCollection<ExerciseCompletionDoc>("exercise_completions");
  if (!completions) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data = await completions.find({ traineeId, completedAt: { $gte: today } }).toArray();
  return mapDocs(data);
}

// ===================== ATTENDANCE =====================
export async function getAttendance(opts?: { traineeId?: number; startDate?: Date; endDate?: Date; limit?: number; offset?: number }) {
  const attendance = await getCollection<AttendanceDoc>("attendance");
  if (!attendance) return { data: [], total: 0 };
  const filter: Record<string, unknown> = {};
  if (opts?.traineeId) filter.traineeId = opts.traineeId;
  if (opts?.startDate || opts?.endDate) {
    filter.checkInTime = {
      ...(opts?.startDate ? { $gte: opts.startDate } : {}),
      ...(opts?.endDate ? { $lte: opts.endDate } : {}),
    };
  }

  const [data, total] = await Promise.all([
    attendance
      .find(filter)
      .sort({ checkInTime: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    attendance.countDocuments(filter),
  ]);

  return { data: mapDocs(data), total };
}

export async function recordAttendance(data: Omit<AttendanceDoc, "_id" | "createdAt">) {
  const attendance = await getCollection<AttendanceDoc>("attendance");
  if (!attendance) throw new Error("DB not available");
  const doc: AttendanceDoc = {
    _id: await getNextId("attendance"),
    traineeId: data.traineeId,
    checkInDate: toDate(data.checkInDate) ?? new Date(),
    checkInTime: toDate(data.checkInTime) ?? new Date(),
    status: data.status ?? "present",
    notes: data.notes ?? null,
    createdAt: new Date(),
  };
  await attendance.insertOne(doc);
  return mapDoc(doc);
}

export async function getTodayAttendanceCount() {
  const attendance = await getCollection<AttendanceDoc>("attendance");
  if (!attendance) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return attendance.countDocuments({ checkInTime: { $gte: today } });
}

// ===================== PROGRESS =====================
export async function getProgressRecords(traineeId: number) {
  const progress = await getCollection<ProgressRecordDoc>("progress_records");
  if (!progress) return [];
  const data = await progress.find({ traineeId }).sort({ recordDate: 1 }).toArray();
  return mapDocs(data);
}

export async function createProgressRecord(data: Omit<ProgressRecordDoc, "_id" | "createdAt">) {
  const progress = await getCollection<ProgressRecordDoc>("progress_records");
  if (!progress) throw new Error("DB not available");
  const doc: ProgressRecordDoc = {
    _id: await getNextId("progress_records"),
    traineeId: data.traineeId,
    recordDate: toDate(data.recordDate) ?? new Date(),
    weight: data.weight ?? null,
    height: data.height ?? null,
    bodyFat: data.bodyFat ?? null,
    chest: data.chest ?? null,
    waist: data.waist ?? null,
    arm: data.arm ?? null,
    thigh: data.thigh ?? null,
    bmi: data.bmi ?? null,
    photoUrl: data.photoUrl ?? null,
    notes: data.notes ?? null,
    createdAt: new Date(),
  };
  await progress.insertOne(doc);
  return mapDoc(doc);
}

export async function updateProgressRecord(id: number, data: Partial<Omit<ProgressRecordDoc, "_id" | "createdAt">>) {
  const progress = await getCollection<ProgressRecordDoc>("progress_records");
  if (!progress) throw new Error("DB not available");
  const update: Record<string, unknown> = { ...data };
  if (data.recordDate) update.recordDate = toDate(data.recordDate);
  await progress.updateOne({ _id: id }, { $set: update });
}

export async function deleteProgressRecord(id: number) {
  const progress = await getCollection<ProgressRecordDoc>("progress_records");
  if (!progress) throw new Error("DB not available");
  return progress.deleteOne({ _id: id });
}
// ===================== SUPPLEMENTS =====================
export async function getSupplementCategories() {
  const categories = await getCollection<SupplementCategoryDoc>("supplement_categories");
  if (!categories) return [];
  const data = await categories.find({}).sort({ name: 1 }).toArray();
  return mapDocs(data);
}

export async function createSupplementCategory(data: { name: string; description?: string | null }) {
  const categories = await getCollection<SupplementCategoryDoc>("supplement_categories");
  if (!categories) throw new Error("DB not available");
  const doc: SupplementCategoryDoc = {
    _id: await getNextId("supplement_categories"),
    name: data.name.trim(),
    description: data.description ?? null,
    createdAt: new Date(),
  };
  await categories.insertOne(doc);
  return mapDoc(doc);
}

export async function updateSupplementCategory(id: number, data: { name?: string; description?: string | null }) {
  const categories = await getCollection<SupplementCategoryDoc>("supplement_categories");
  if (!categories) throw new Error("DB not available");
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.description !== undefined) update.description = data.description ?? null;
  await categories.updateOne({ _id: id }, { $set: update });
}

export async function deleteSupplementCategory(id: number) {
  const supplements = await getCollection<SupplementDoc>("supplements");
  const categories = await getCollection<SupplementCategoryDoc>("supplement_categories");
  if (!supplements || !categories) throw new Error("DB not available");
  const usageCount = await supplements.countDocuments({ categoryId: id });
  if (usageCount > 0) throw new Error("Category is used by products");
  return categories.deleteOne({ _id: id });
}

export async function getSupplements(opts?: { categoryId?: number; search?: string; isFeatured?: boolean; isActive?: boolean; limit?: number; offset?: number }) {
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!supplements) return { data: [], total: 0 };
  const filter: Record<string, unknown> = {};
  if (opts?.categoryId) filter.categoryId = opts.categoryId;
  if (opts?.isFeatured !== undefined) filter.isFeatured = opts.isFeatured;
  if (opts?.isActive !== undefined) filter.isActive = opts.isActive;
  if (opts?.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { brand: regex }];
  }

  const [data, total] = await Promise.all([
    supplements
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    supplements.countDocuments(filter),
  ]);

  return { data: mapDocs(data), total };
}

export async function getSupplementById(id: number) {
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!supplements) return undefined;
  const doc = await supplements.findOne({ _id: id });
  return mapDoc(doc);
}

export async function createSupplement(data: Omit<SupplementDoc, "_id" | "createdAt" | "updatedAt">) {
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!supplements) throw new Error("DB not available");
  const now = new Date();
  const doc: SupplementDoc = {
    _id: await getNextId("supplements"),
    categoryId: data.categoryId ?? null,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    discountPrice: data.discountPrice ?? null,
    stock: data.stock ?? 0,
    sku: data.sku ?? null,
    brand: data.brand ?? null,
    imageUrl: data.imageUrl ?? null,
    isFeatured: data.isFeatured ?? false,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await supplements.insertOne(doc);
  return mapDoc(doc);
}

export async function updateSupplement(id: number, data: Partial<Omit<SupplementDoc, "_id" | "createdAt" | "updatedAt">>) {
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!supplements) throw new Error("DB not available");
  await supplements.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteSupplement(id: number) {
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!supplements) throw new Error("DB not available");
  return supplements.deleteOne({ _id: id });
}

export async function getSupplementOrders(opts?: { traineeId?: number; status?: string; limit?: number; offset?: number }) {
  const orders = await getCollection<SupplementOrderDoc>("supplement_orders");
  if (!orders) return { data: [], total: 0 };
  const trainees = await getCollection<TraineeDoc>("trainees");
  const orderItems = await getCollection<SupplementOrderItemDoc>("supplement_order_items");
  const filter: Record<string, unknown> = {};
  if (opts?.traineeId) filter.traineeId = opts.traineeId;
  if (opts?.status) filter.status = opts.status;

  const [data, total] = await Promise.all([
    orders
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    orders.countDocuments(filter),
  ]);

  const mappedOrders = mapDocs(data);
  const orderIds = mappedOrders.map((order) => order.id);
  const traineeIds = Array.from(new Set(mappedOrders.map((order) => order.traineeId)));

  const [traineeRows, orderItemRows] = await Promise.all([
    trainees ? trainees.find({ _id: { $in: traineeIds } }).toArray() : Promise.resolve([] as TraineeDoc[]),
    orderItems
      ? orderItems
          .aggregate([
            { $match: { orderId: { $in: orderIds } } },
            { $group: { _id: "$orderId", itemCount: { $sum: "$quantity" } } },
          ])
          .toArray()
      : Promise.resolve([] as Array<{ _id: number; itemCount: number }>),
  ]);

  const traineeNameById = new Map(traineeRows.map((trainee) => [trainee._id, trainee.fullName]));
  const orderItemCountById = new Map(orderItemRows.map((row) => [row._id, row.itemCount]));

  return {
    data: mappedOrders.map((order) => ({
      ...order,
      traineeName: traineeNameById.get(order.traineeId),
      itemCount: orderItemCountById.get(order.id) ?? 0,
    })),
    total,
  };
}

export async function getSupplementOrderById(id: number) {
  const orders = await getCollection<SupplementOrderDoc>("supplement_orders");
  if (!orders) return undefined;
  const doc = await orders.findOne({ _id: id });
  return mapDoc(doc);
}

export async function getSupplementOrderItems(orderId: number) {
  const orderItems = await getCollection<SupplementOrderItemDoc>("supplement_order_items");
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!orderItems || !supplements) return [];

  const items = await orderItems.find({ orderId }).sort({ _id: 1 }).toArray();
  const supplementIds = Array.from(new Set(items.map((item) => item.supplementId)));
  const supplementRows = await supplements.find({ _id: { $in: supplementIds } }).toArray();
  const supplementById = new Map(supplementRows.map((supplement) => [supplement._id, supplement]));

  return mapDocs(items).map((item) => {
    const supplement = supplementById.get(item.supplementId);
    return {
      ...item,
      supplementName: supplement?.name,
      supplementImageUrl: supplement?.imageUrl ?? null,
    };
  });
}

export async function createSupplementOrder(
  traineeId: number,
  items: Array<{ supplementId: number; quantity: number }>,
  notes?: string | null
) {
  if (items.length === 0) throw new Error("Order items are required");
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const supplements = db.collection<SupplementDoc>("supplements");
  const orders = db.collection<SupplementOrderDoc>("supplement_orders");
  const orderItems = db.collection<SupplementOrderItemDoc>("supplement_order_items");

  const session = client?.startSession();
  if (!session) throw new Error("DB session not available");

  let orderId: number | undefined;

  try {
    await session.withTransaction(async () => {
      let totalAmount = 0;
      const itemsWithPrices: Array<{ supplementId: number; quantity: number; unitPrice: number; totalPrice: number }> = [];

      for (const item of items) {
        const supp = await supplements.findOne({ _id: item.supplementId }, { session });
        if (!supp) throw new Error(`Supplement ${item.supplementId} not found`);
        if (!supp.isActive) throw new Error(`${supp.name} is not active`);
        if (supp.stock < item.quantity) throw new Error(`Not enough stock for ${supp.name}`);
        const unitPrice = Number(supp.discountPrice ?? supp.price);
        const totalPrice = unitPrice * item.quantity;
        totalAmount += totalPrice;
        itemsWithPrices.push({ supplementId: item.supplementId, quantity: item.quantity, unitPrice, totalPrice });
      }

      orderId = await getNextId("supplement_orders");
      const now = new Date();
      await orders.insertOne(
        {
          _id: orderId,
          traineeId,
          totalAmount: String(totalAmount),
          status: "pending",
          paymentId: null,
          paymentMethod: null,
          paidAt: null,
          notes: notes ?? null,
          createdAt: now,
          updatedAt: now,
        },
        { session }
      );

      for (const item of itemsWithPrices) {
        const orderItemId = await getNextId("supplement_order_items");
        await orderItems.insertOne(
          {
            _id: orderItemId,
            orderId,
            supplementId: item.supplementId,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.totalPrice),
            createdAt: now,
          },
          { session }
        );

        await supplements.updateOne(
          { _id: item.supplementId },
          { $inc: { stock: -item.quantity } },
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return orderId;
}

export async function recordSupplementOrderPayment(
  orderId: number,
  data: {
    paymentMethod: "cash" | "card" | "wallet" | "transfer";
    paymentDate?: Date | string;
    receiptNumber?: string | null;
    notes?: string | null;
  }
) {
  const orders = await getCollection<SupplementOrderDoc>("supplement_orders");
  if (!orders) throw new Error("DB not available");

  const order = await orders.findOne({ _id: orderId });
  if (!order) throw new Error("Order not found");
  if (order.status === "cancelled") throw new Error("Cancelled orders cannot be paid");
  if (order.paymentId) throw new Error("Order is already paid");

  const paymentDate = toDate(data.paymentDate) ?? new Date();
  const payment = await createPayment({
    traineeId: order.traineeId,
    supplementOrderId: orderId,
    amount: order.totalAmount,
    discount: "0",
    finalAmount: order.totalAmount,
    paymentMethod: data.paymentMethod,
    paymentDate,
    receiptNumber: data.receiptNumber ?? null,
    notes: data.notes ?? `Supplement order #${orderId}`,
    type: "supplement",
  });

  if (!payment) throw new Error("Failed to create payment");

  await orders.updateOne(
    { _id: orderId },
    {
      $set: {
        paymentId: payment.id,
        paymentMethod: data.paymentMethod,
        paidAt: paymentDate,
        updatedAt: new Date(),
      },
    }
  );

  return {
    orderId,
    paymentId: payment.id,
    paidAt: paymentDate,
  };
}

export async function updateSupplementOrderStatus(id: number, status: string) {
  const orders = await getCollection<SupplementOrderDoc>("supplement_orders");
  const orderItems = await getCollection<SupplementOrderItemDoc>("supplement_order_items");
  const supplements = await getCollection<SupplementDoc>("supplements");
  if (!orders || !orderItems || !supplements) throw new Error("DB not available");

  const currentOrder = await orders.findOne({ _id: id });
  if (!currentOrder) throw new Error("Order not found");
  if (currentOrder.status === status) return { matchedCount: 1, modifiedCount: 0 };

  if (status === "cancelled" && currentOrder.status !== "cancelled") {
    if (currentOrder.paymentId) {
      throw new Error("Paid orders cannot be cancelled");
    }
    const items = await orderItems.find({ orderId: id }).toArray();
    for (const item of items) {
      await supplements.updateOne({ _id: item.supplementId }, { $inc: { stock: item.quantity } });
    }
  }

  return orders.updateOne({ _id: id }, { $set: { status: status as any, updatedAt: new Date() } });
}

// ===================== NUTRITION =====================
async function recalculateNutritionPlanTotals(planId: number) {
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!plans || !meals || !foods) throw new Error("DB not available");

  const mealRows = await meals.find({ planId }).toArray();
  const mealIds = mealRows.map((meal) => meal._id);
  const foodRows = mealIds.length > 0 ? await foods.find({ mealId: { $in: mealIds } }).toArray() : [];

  const mealTotals = new Map<number, number>();
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const food of foodRows) {
    totalCalories += Number(food.calories ?? 0);
    totalProtein += Number(food.protein ?? 0);
    totalCarbs += Number(food.carbs ?? 0);
    totalFat += Number(food.fat ?? 0);
    mealTotals.set(food.mealId, (mealTotals.get(food.mealId) ?? 0) + Number(food.calories ?? 0));
  }

  await Promise.all(
    mealRows.map((meal) =>
      meals.updateOne(
        { _id: meal._id },
        { $set: { totalCalories: Number((mealTotals.get(meal._id) ?? 0).toFixed(2)), updatedAt: new Date() } }
      )
    )
  );

  await plans.updateOne(
    { _id: planId },
    {
      $set: {
        totalCalories: Number(totalCalories.toFixed(2)),
        totalProtein: Number(totalProtein.toFixed(2)),
        totalCarbs: Number(totalCarbs.toFixed(2)),
        totalFat: Number(totalFat.toFixed(2)),
        updatedAt: new Date(),
      },
    }
  );
}

export async function getNutritionPlans(opts?: {
  search?: string;
  goal?: NutritionGoal;
  isTemplate?: boolean;
  limit?: number;
  offset?: number;
}) {
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  if (!plans) return { data: [], total: 0 };
  const assignments = await getCollection<NutritionAssignmentDoc>("nutritionAssignments");
  const filter: Record<string, unknown> = {};

  if (opts?.goal) filter.goal = opts.goal;
  if (opts?.isTemplate !== undefined) filter.isTemplate = opts.isTemplate;
  if (opts?.search) filter.name = { $regex: new RegExp(opts.search, "i") };

  const [rows, total, activeAssignments] = await Promise.all([
    plans
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    plans.countDocuments(filter),
    assignments ? assignments.countDocuments({ status: "active" }) : Promise.resolve(0),
  ]);

  const mapped = mapDocs(rows);
  const avgCalories = mapped.length > 0
    ? Number((mapped.reduce((sum, plan) => sum + Number(plan.totalCalories ?? 0), 0) / mapped.length).toFixed(2))
    : 0;

  return { data: mapped, total, stats: { totalPlans: total, activeAssignments, avgCalories } };
}

export async function getNutritionPlanById(id: number) {
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!plans || !meals || !foods) return undefined;

  const plan = await plans.findOne({ _id: id });
  if (!plan) return undefined;

  const mealRows = await meals.find({ planId: id }).sort({ mealOrder: 1, createdAt: 1 }).toArray();
  const mealIds = mealRows.map((meal) => meal._id);
  const foodRows = mealIds.length > 0 ? await foods.find({ mealId: { $in: mealIds } }).sort({ createdAt: 1 }).toArray() : [];

  const foodsByMeal = new Map<number, Array<Omit<NutritionFoodDoc, "_id"> & { id: number }>>();
  for (const food of mapDocs(foodRows)) {
    const list = foodsByMeal.get(food.mealId) ?? [];
    list.push(food);
    foodsByMeal.set(food.mealId, list);
  }

  const mappedPlan = mapDoc(plan)!;
  const mappedMeals = mapDocs(mealRows).map((meal) => ({
    ...meal,
    foods: foodsByMeal.get(meal.id) ?? [],
  }));

  return { ...mappedPlan, meals: mappedMeals };
}

export async function createNutritionPlan(data: {
  name: string;
  description?: string | null;
  goal: NutritionGoal;
  createdBy?: number | null;
  isTemplate?: boolean;
  meals?: Array<{
    mealName: NutritionMealName;
    mealOrder?: number;
    foods?: Array<{
      foodName: string;
      quantity: number;
      unit: NutritionUnit;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      notes?: string | null;
    }>;
  }>;
}) {
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!plans || !meals || !foods) throw new Error("DB not available");

  const now = new Date();
  const planId = await getNextId("nutritionPlans");

  const planDoc: NutritionPlanDoc = {
    _id: planId,
    name: data.name.trim(),
    description: data.description ?? null,
    goal: data.goal,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    createdBy: data.createdBy ?? null,
    isTemplate: data.isTemplate ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await plans.insertOne(planDoc);

  const mealsInput = data.meals ?? [];
  for (let index = 0; index < mealsInput.length; index += 1) {
    const meal = mealsInput[index];
    const mealId = await getNextId("nutritionMeals");
    await meals.insertOne({
      _id: mealId,
      planId,
      mealName: meal.mealName,
      mealOrder: meal.mealOrder ?? index + 1,
      totalCalories: 0,
      createdAt: now,
      updatedAt: now,
    });

    for (const food of meal.foods ?? []) {
      await foods.insertOne({
        _id: await getNextId("nutritionFoods"),
        mealId,
        foodName: food.foodName,
        quantity: Number(food.quantity ?? 0),
        unit: food.unit,
        calories: Number(food.calories ?? 0),
        protein: Number(food.protein ?? 0),
        carbs: Number(food.carbs ?? 0),
        fat: Number(food.fat ?? 0),
        notes: food.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await recalculateNutritionPlanTotals(planId);
  return getNutritionPlanById(planId);
}

export async function updateNutritionPlan(
  id: number,
  data: Partial<{
    name: string;
    description?: string | null;
    goal: NutritionGoal;
    isTemplate: boolean;
    meals: Array<{
      mealName: NutritionMealName;
      mealOrder?: number;
      foods?: Array<{
        foodName: string;
        quantity: number;
        unit: NutritionUnit;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        notes?: string | null;
      }>;
    }>;
  }>
) {
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!plans || !meals || !foods) throw new Error("DB not available");

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.description !== undefined) update.description = data.description ?? null;
  if (data.goal !== undefined) update.goal = data.goal;
  if (data.isTemplate !== undefined) update.isTemplate = data.isTemplate;
  await plans.updateOne({ _id: id }, { $set: update });

  if (data.meals) {
    const existingMeals = await meals.find({ planId: id }).toArray();
    const existingMealIds = existingMeals.map((meal) => meal._id);
    if (existingMealIds.length > 0) {
      await foods.deleteMany({ mealId: { $in: existingMealIds } });
      await meals.deleteMany({ planId: id });
    }

    const now = new Date();
    for (let index = 0; index < data.meals.length; index += 1) {
      const meal = data.meals[index];
      const mealId = await getNextId("nutritionMeals");
      await meals.insertOne({
        _id: mealId,
        planId: id,
        mealName: meal.mealName,
        mealOrder: meal.mealOrder ?? index + 1,
        totalCalories: 0,
        createdAt: now,
        updatedAt: now,
      });

      for (const food of meal.foods ?? []) {
        await foods.insertOne({
          _id: await getNextId("nutritionFoods"),
          mealId,
          foodName: food.foodName,
          quantity: Number(food.quantity ?? 0),
          unit: food.unit,
          calories: Number(food.calories ?? 0),
          protein: Number(food.protein ?? 0),
          carbs: Number(food.carbs ?? 0),
          fat: Number(food.fat ?? 0),
          notes: food.notes ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  await recalculateNutritionPlanTotals(id);
  return getNutritionPlanById(id);
}

export async function duplicateNutritionPlan(id: number, createdBy?: number | null) {
  const plan = await getNutritionPlanById(id);
  if (!plan) throw new Error("Nutrition plan not found");
  return createNutritionPlan({
    name: `${plan.name} Copy`,
    description: plan.description,
    goal: plan.goal,
    createdBy: createdBy ?? null,
    isTemplate: plan.isTemplate,
    meals: (plan.meals ?? []).map((meal) => ({
      mealName: meal.mealName,
      mealOrder: meal.mealOrder,
      foods: (meal.foods ?? []).map((food) => ({
        foodName: food.foodName,
        quantity: Number(food.quantity),
        unit: food.unit,
        calories: Number(food.calories),
        protein: Number(food.protein),
        carbs: Number(food.carbs),
        fat: Number(food.fat),
        notes: food.notes ?? null,
      })),
    })),
  });
}

export async function deleteNutritionPlan(id: number) {
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  const assignments = await getCollection<NutritionAssignmentDoc>("nutritionAssignments");
  if (!plans || !meals || !foods || !assignments) throw new Error("DB not available");

  const linkedAssignments = await assignments.countDocuments({ planId: id });
  if (linkedAssignments > 0) throw new Error("Cannot delete plan with existing assignments");

  const mealRows = await meals.find({ planId: id }).toArray();
  const mealIds = mealRows.map((meal) => meal._id);
  if (mealIds.length > 0) await foods.deleteMany({ mealId: { $in: mealIds } });
  await meals.deleteMany({ planId: id });
  return plans.deleteOne({ _id: id });
}

export async function addNutritionMeal(data: {
  planId: number;
  mealName: NutritionMealName;
  mealOrder?: number;
}) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  if (!meals) throw new Error("DB not available");
  const now = new Date();
  const doc: NutritionMealDoc = {
    _id: await getNextId("nutritionMeals"),
    planId: data.planId,
    mealName: data.mealName,
    mealOrder: data.mealOrder ?? 1,
    totalCalories: 0,
    createdAt: now,
    updatedAt: now,
  };
  await meals.insertOne(doc);
  await recalculateNutritionPlanTotals(data.planId);
  return mapDoc(doc);
}

export async function updateNutritionMeal(
  id: number,
  data: Partial<{ mealName: NutritionMealName; mealOrder: number }>
) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  if (!meals) throw new Error("DB not available");
  const meal = await meals.findOne({ _id: id });
  if (!meal) throw new Error("Meal not found");
  await meals.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
  await recalculateNutritionPlanTotals(meal.planId);
}

export async function deleteNutritionMeal(id: number) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!meals || !foods) throw new Error("DB not available");
  const meal = await meals.findOne({ _id: id });
  if (!meal) throw new Error("Meal not found");
  await foods.deleteMany({ mealId: id });
  await meals.deleteOne({ _id: id });
  await recalculateNutritionPlanTotals(meal.planId);
}

export async function reorderNutritionMeals(planId: number, mealIds: number[]) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  if (!meals) throw new Error("DB not available");
  await Promise.all(
    mealIds.map((mealId, index) =>
      meals.updateOne({ _id: mealId, planId }, { $set: { mealOrder: index + 1, updatedAt: new Date() } })
    )
  );
}

export async function addNutritionFood(data: {
  mealId: number;
  foodName: string;
  quantity: number;
  unit: NutritionUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string | null;
}) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!meals || !foods) throw new Error("DB not available");
  const meal = await meals.findOne({ _id: data.mealId });
  if (!meal) throw new Error("Meal not found");
  const now = new Date();
  const doc: NutritionFoodDoc = {
    _id: await getNextId("nutritionFoods"),
    mealId: data.mealId,
    foodName: data.foodName,
    quantity: Number(data.quantity ?? 0),
    unit: data.unit,
    calories: Number(data.calories ?? 0),
    protein: Number(data.protein ?? 0),
    carbs: Number(data.carbs ?? 0),
    fat: Number(data.fat ?? 0),
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await foods.insertOne(doc);
  await recalculateNutritionPlanTotals(meal.planId);
  return mapDoc(doc);
}

export async function updateNutritionFood(
  id: number,
  data: Partial<{
    foodName: string;
    quantity: number;
    unit: NutritionUnit;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    notes?: string | null;
  }>
) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!meals || !foods) throw new Error("DB not available");
  const food = await foods.findOne({ _id: id });
  if (!food) throw new Error("Food item not found");
  const meal = await meals.findOne({ _id: food.mealId });
  if (!meal) throw new Error("Meal not found");
  await foods.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
  await recalculateNutritionPlanTotals(meal.planId);
}

export async function deleteNutritionFood(id: number) {
  const meals = await getCollection<NutritionMealDoc>("nutritionMeals");
  const foods = await getCollection<NutritionFoodDoc>("nutritionFoods");
  if (!meals || !foods) throw new Error("DB not available");
  const food = await foods.findOne({ _id: id });
  if (!food) throw new Error("Food item not found");
  const meal = await meals.findOne({ _id: food.mealId });
  if (!meal) throw new Error("Meal not found");
  await foods.deleteOne({ _id: id });
  await recalculateNutritionPlanTotals(meal.planId);
}

export async function assignNutritionPlan(data: {
  planId: number;
  traineeId: number;
  startDate: Date | string;
  endDate: Date | string;
  status?: NutritionAssignmentStatus;
  notes?: string | null;
  assignedBy?: number | null;
}) {
  const assignments = await getCollection<NutritionAssignmentDoc>("nutritionAssignments");
  if (!assignments) throw new Error("DB not available");
  const now = new Date();
  // Keep a single active plan per trainee to avoid ambiguous user-facing plan resolution.
  await assignments.updateMany(
    { traineeId: data.traineeId, status: "active" },
    { $set: { status: "paused", updatedAt: now } }
  );
  const doc: NutritionAssignmentDoc = {
    _id: await getNextId("nutritionAssignments"),
    planId: data.planId,
    traineeId: data.traineeId,
    startDate: toDate(data.startDate) ?? now,
    endDate: toDate(data.endDate) ?? now,
    status: data.status ?? "active",
    notes: data.notes ?? null,
    assignedBy: data.assignedBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await assignments.insertOne(doc);
  return mapDoc(doc);
}

export async function updateNutritionAssignment(
  id: number,
  data: Partial<{
    planId: number;
    traineeId: number;
    startDate: Date | string;
    endDate: Date | string;
    status: NutritionAssignmentStatus;
    notes?: string | null;
  }>
) {
  const assignments = await getCollection<NutritionAssignmentDoc>("nutritionAssignments");
  if (!assignments) throw new Error("DB not available");
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.planId !== undefined) update.planId = data.planId;
  if (data.traineeId !== undefined) update.traineeId = data.traineeId;
  if (data.startDate !== undefined) update.startDate = toDate(data.startDate);
  if (data.endDate !== undefined) update.endDate = toDate(data.endDate);
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes ?? null;
  await assignments.updateOne({ _id: id }, { $set: update });
}

export async function getNutritionAssignments(opts?: {
  traineeId?: number;
  planId?: number;
  status?: NutritionAssignmentStatus;
  limit?: number;
  offset?: number;
}) {
  const assignments = await getCollection<NutritionAssignmentDoc>("nutritionAssignments");
  const plans = await getCollection<NutritionPlanDoc>("nutritionPlans");
  const trainees = await getCollection<TraineeDoc>("trainees");
  if (!assignments || !plans || !trainees) return { data: [], total: 0 };

  const filter: Record<string, unknown> = {};
  if (opts?.traineeId) filter.traineeId = opts.traineeId;
  if (opts?.planId) filter.planId = opts.planId;
  if (opts?.status) filter.status = opts.status;

  const [rows, total] = await Promise.all([
    assignments
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 100)
      .toArray(),
    assignments.countDocuments(filter),
  ]);

  const mapped = mapDocs(rows);
  const planIds = Array.from(new Set(mapped.map((assignment) => assignment.planId)));
  const traineeIds = Array.from(new Set(mapped.map((assignment) => assignment.traineeId)));
  const [planRows, traineeRows] = await Promise.all([
    planIds.length > 0 ? plans.find({ _id: { $in: planIds } }).toArray() : Promise.resolve([] as NutritionPlanDoc[]),
    traineeIds.length > 0 ? trainees.find({ _id: { $in: traineeIds } }).toArray() : Promise.resolve([] as TraineeDoc[]),
  ]);

  const planNameById = new Map(planRows.map((plan) => [plan._id, plan.name]));
  const traineeNameById = new Map(traineeRows.map((trainee) => [trainee._id, trainee.fullName]));

  return {
    data: mapped.map((assignment) => ({
      ...assignment,
      planName: planNameById.get(assignment.planId),
      traineeName: traineeNameById.get(assignment.traineeId),
    })),
    total,
  };
}

export async function getTraineeActiveNutritionPlan(traineeId: number) {
  const assignments = await getCollection<NutritionAssignmentDoc>("nutritionAssignments");
  if (!assignments) return null;
  const now = new Date();
  const active = await assignments.findOne(
    {
      traineeId,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    },
    { sort: { createdAt: -1 } }
  );
  const fallback = active ?? await assignments.findOne({ traineeId, status: "active" }, { sort: { createdAt: -1 } });
  if (!fallback) return null;
  const plan = await getNutritionPlanById(fallback.planId);
  if (!plan) return null;
  return { assignment: mapDoc(fallback), plan };
}

// ===================== MARKETING =====================
export async function getCampaigns(opts?: { status?: string; limit?: number; offset?: number }) {
  const campaigns = await getCollection<MarketingCampaignDoc>("marketing_campaigns");
  if (!campaigns) return { data: [], total: 0 };
  const filter: Record<string, unknown> = {};
  if (opts?.status) filter.status = opts.status;

  const [data, total] = await Promise.all([
    campaigns
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(opts?.offset ?? 0)
      .limit(opts?.limit ?? 50)
      .toArray(),
    campaigns.countDocuments(filter),
  ]);

  return { data: mapDocs(data), total };
}

export async function getCampaignById(id: number) {
  const campaigns = await getCollection<MarketingCampaignDoc>("marketing_campaigns");
  if (!campaigns) return undefined;
  const doc = await campaigns.findOne({ _id: id });
  return mapDoc(doc);
}

export async function createCampaign(data: Omit<MarketingCampaignDoc, "_id" | "createdAt" | "updatedAt">) {
  const campaigns = await getCollection<MarketingCampaignDoc>("marketing_campaigns");
  if (!campaigns) throw new Error("DB not available");
  const now = new Date();
  const doc: MarketingCampaignDoc = {
    _id: await getNextId("marketing_campaigns"),
    title: data.title,
    message: data.message,
    targetAudience: data.targetAudience ?? "all",
    targetPlanId: data.targetPlanId ?? null,
    targetGoal: data.targetGoal ?? null,
    channel: data.channel ?? "in_app",
    status: data.status ?? "draft",
    scheduledAt: data.scheduledAt ?? null,
    sentAt: data.sentAt ?? null,
    recipientCount: data.recipientCount ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  await campaigns.insertOne(doc);
  return mapDoc(doc);
}

export async function updateCampaign(id: number, data: Partial<Omit<MarketingCampaignDoc, "_id" | "createdAt" | "updatedAt">>) {
  const campaigns = await getCollection<MarketingCampaignDoc>("marketing_campaigns");
  if (!campaigns) throw new Error("DB not available");
  await campaigns.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteCampaign(id: number) {
  const campaigns = await getCollection<MarketingCampaignDoc>("marketing_campaigns");
  if (!campaigns) throw new Error("DB not available");
  return campaigns.deleteOne({ _id: id });
}

export async function getMessageTemplates() {
  const templates = await getCollection<MessageTemplateDoc>("message_templates");
  if (!templates) return [];
  const data = await templates.find({}).sort({ name: 1 }).toArray();
  return mapDocs(data);
}

export async function createMessageTemplate(data: Omit<MessageTemplateDoc, "_id" | "createdAt" | "updatedAt">) {
  const templates = await getCollection<MessageTemplateDoc>("message_templates");
  if (!templates) throw new Error("DB not available");
  const now = new Date();
  const doc: MessageTemplateDoc = {
    _id: await getNextId("message_templates"),
    name: data.name,
    content: data.content,
    category: data.category ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await templates.insertOne(doc);
  return mapDoc(doc);
}

// ===================== NOTIFICATIONS =====================
export async function getNotifications(opts?: { userId?: number; traineeId?: number; isRead?: boolean; limit?: number }) {
  const notifications = await getCollection<NotificationDoc>("notifications");
  if (!notifications) return [];
  const filter: Record<string, unknown> = {};
  if (opts?.userId && opts?.traineeId) {
    filter.$or = [{ userId: opts.userId }, { traineeId: opts.traineeId }];
  } else if (opts?.userId) {
    filter.userId = opts.userId;
  } else if (opts?.traineeId) {
    filter.traineeId = opts.traineeId;
  }
  if (opts?.isRead !== undefined) filter.isRead = opts.isRead;

  const data = await notifications
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(opts?.limit ?? 50)
    .toArray();

  return mapDocs(data);
}

export async function createNotification(data: Omit<NotificationDoc, "_id" | "createdAt">) {
  const notifications = await getCollection<NotificationDoc>("notifications");
  if (!notifications) throw new Error("DB not available");
  const counters = await getCollection<CounterDoc>("counters");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const doc: NotificationDoc = {
      _id: await getNextId("notifications"),
      userId: data.userId ?? null,
      traineeId: data.traineeId ?? null,
      title: data.title,
      message: data.message,
      type: data.type ?? "general",
      isRead: data.isRead ?? false,
      createdAt: new Date(),
    };
    try {
      await notifications.insertOne(doc);
      return mapDoc(doc);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000 && attempt < 2) {
        // Self-heal counter drift: align notifications counter to current max _id.
        if (counters) {
          const latest = await notifications.find({}).sort({ _id: -1 }).limit(1).next();
          const maxId = typeof latest?._id === "number" ? latest._id : 0;
          await counters.updateOne(
            { _id: "notifications" },
            { $max: { seq: maxId } },
            { upsert: true }
          );
        }
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to create notification");
}

export async function markNotificationRead(id: number) {
  const notifications = await getCollection<NotificationDoc>("notifications");
  if (!notifications) throw new Error("DB not available");
  return notifications.updateOne({ _id: id }, { $set: { isRead: true } });
}

export async function markNotificationReadForRecipient(
  id: number,
  opts: { userId: number; traineeId?: number }
) {
  const notifications = await getCollection<NotificationDoc>("notifications");
  if (!notifications) throw new Error("DB not available");
  const recipientFilter = opts.traineeId
    ? { $or: [{ userId: opts.userId }, { traineeId: opts.traineeId }] }
    : { userId: opts.userId };
  return notifications.updateOne(
    { _id: id, ...recipientFilter },
    { $set: { isRead: true } }
  );
}

export async function markAllNotificationsRead(userId: number) {
  const notifications = await getCollection<NotificationDoc>("notifications");
  if (!notifications) throw new Error("DB not available");
  return notifications.updateMany({ userId }, { $set: { isRead: true } });
}

export async function markAllNotificationsReadForRecipient(opts: {
  userId: number;
  traineeId?: number;
}) {
  const notifications = await getCollection<NotificationDoc>("notifications");
  if (!notifications) throw new Error("DB not available");
  const filter = opts.traineeId
    ? { $or: [{ userId: opts.userId }, { traineeId: opts.traineeId }] }
    : { userId: opts.userId };
  return notifications.updateMany(filter, { $set: { isRead: true } });
}

// ===================== DASHBOARD STATS =====================
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trainees = db.collection<TraineeDoc>("trainees");
  const subscriptions = db.collection<SubscriptionDoc>("subscriptions");
  const payments = db.collection<PaymentDoc>("payments");
  const attendance = db.collection<AttendanceDoc>("attendance");
  const supplementOrders = db.collection<SupplementOrderDoc>("supplement_orders");
  const supplements = db.collection<SupplementDoc>("supplements");

  const [
    totalTrainees,
    activeTrainees,
    activeSubscriptions,
    expiredSubscriptions,
    expiringSoon,
    revenueStats,
    todayAttendance,
    totalOrders,
    lowStockSupplements,
    newTraineesThisMonth,
  ] = await Promise.all([
    trainees.countDocuments({}),
    trainees.countDocuments({ isActive: true }),
    subscriptions.countDocuments({ status: "active" }),
    subscriptions.countDocuments({ status: "expired" }),
    subscriptions.countDocuments({ status: "active", endDate: { $lte: sevenDaysLater } }),
    payments
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$finalAmount" } },
            monthly: {
              $sum: {
                $cond: [
                  { $gte: ["$paymentDate", startOfMonth] },
                  { $toDouble: "$finalAmount" },
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray(),
    attendance.countDocuments({ checkInTime: { $gte: today } }),
    supplementOrders.countDocuments({}),
    supplements.countDocuments({ isActive: true, stock: { $lt: 10 } }),
    trainees.countDocuments({ createdAt: { $gte: startOfMonth } }),
  ]);

  return {
    totalTrainees: totalTrainees ?? 0,
    activeTrainees: activeTrainees ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    expiredSubscriptions: expiredSubscriptions ?? 0,
    expiringSoon: expiringSoon ?? 0,
    totalRevenue: Number((revenueStats[0] as any)?.total ?? 0),
    monthlyRevenue: Number((revenueStats[0] as any)?.monthly ?? 0),
    todayAttendance: todayAttendance ?? 0,
    totalOrders: totalOrders ?? 0,
    lowStockSupplements: lowStockSupplements ?? 0,
    newTraineesThisMonth: newTraineesThisMonth ?? 0,
  };
}

