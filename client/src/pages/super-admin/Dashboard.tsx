import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  Building2,
  CalendarClock,
  CreditCard,
  Database,
  Dumbbell,
  LogOut,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const API_BASE = "http://localhost:4000/api/v1";

type Analytics = {
  totalGyms: number;
  activeGyms: number;
  totalMembers: number;
  totalRevenue: number;
};

type Gym = {
  id: string;
  slug: string;
  name: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  status: string;
  plan: string;
  trialEndDate: string;
  subscriptionEnd?: string | null;
  databaseName?: string | null;
  createdAt: string;
  _count?: {
    members: number;
    users: number;
  };
};

type SessionUser = {
  fullName: string;
  email: string;
  role: string;
};

function token() {
  return localStorage.getItem("gymos_access_token");
}

function currentUser() {
  const raw = localStorage.getItem("gymos_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (Array.isArray(payload.errors)) {
      const details = payload.errors
        .map((item: { path?: string; message?: string }) => `${item.path ?? "field"}: ${item.message ?? "Invalid value"}`)
        .join(", ");
      throw new Error(details || payload.message || "Request failed");
    }
    throw new Error(payload.message ?? "Request failed");
  }
  return payload;
}

function daysLeft(dateValue?: string | null) {
  if (!dateValue) return null;
  const end = new Date(dateValue).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const user = useMemo(currentUser, []);

  async function loadPlatform() {
    setLoading(true);
    setError("");
    try {
      const [analyticsPayload, gymsPayload] = await Promise.all([
        apiFetch<Analytics>("/super-admin/analytics"),
        apiFetch<{ data: Gym[] }>("/super-admin/gyms"),
      ]);
      setAnalytics(analyticsPayload);
      setGyms(gymsPayload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Super Admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token()) {
      window.location.href = "/saas/login";
      return;
    }
    loadPlatform();
  }, []);

  async function createGym(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");

    const data = new FormData(event.currentTarget);
    const rawSlug = String(data.get("gymSlug") ?? "");
    const normalizedSlug = rawSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    try {
      await apiFetch("/super-admin/gyms", {
        method: "POST",
        body: JSON.stringify({
          gymName: data.get("gymName"),
          gymSlug: normalizedSlug,
          ownerName: data.get("ownerName"),
          ownerEmail: data.get("ownerEmail"),
          ownerPhone: data.get("ownerPhone") || undefined,
          adminPassword: data.get("adminPassword"),
          country: data.get("country") || undefined,
          city: data.get("city") || undefined,
          address: data.get("address") || undefined,
          domain: data.get("domain") || undefined,
          plan: data.get("plan"),
          trialDays: data.get("trialDays"),
          maxMembers: data.get("maxMembers") || undefined,
          maxTrainers: data.get("maxTrainers") || undefined,
          storageLimitGb: data.get("storageLimitGb") || undefined,
        }),
      });

      event.currentTarget.reset();
      setMessage("Gym trial created. Admin account and isolated Mongo database are ready.");
      await loadPlatform();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create gym");
    } finally {
      setCreating(false);
    }
  }

  async function updateGym(gymId: string, field: "status" | "plan", value: string) {
    setError("");
    try {
      await apiFetch(`/super-admin/gyms/${gymId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      await loadPlatform();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update gym");
    }
  }

  function logout() {
    localStorage.removeItem("gymos_access_token");
    localStorage.removeItem("gymos_refresh_token");
    localStorage.removeItem("gymos_user");
    window.location.href = "/saas/login";
  }

  const expiredGyms = gyms.filter((gym) => {
    const remainingTrialDays = daysLeft(gym.trialEndDate);
    const remainingSubscriptionDays = daysLeft(gym.subscriptionEnd);
    return remainingSubscriptionDays !== null
      ? remainingSubscriptionDays < 0
      : remainingTrialDays !== null && remainingTrialDays < 0;
  }).length;
  const trialGyms = gyms.filter((gym) => daysLeft(gym.trialEndDate) !== null && daysLeft(gym.trialEndDate)! >= 0).length;
  const totalDatabases = gyms.filter((gym) => gym.databaseName).length;

  const stats = [
    { label: "Total Gyms", value: analytics?.totalGyms ?? 0, icon: Building2 },
    { label: "Active Gyms", value: analytics?.activeGyms ?? 0, icon: Activity },
    { label: "Trial Gyms", value: trialGyms, icon: CalendarClock },
    { label: "Expired Gyms", value: expiredGyms, icon: Shield },
    { label: "Total Members", value: analytics?.totalMembers ?? 0, icon: Users },
    { label: "Monthly Revenue", value: `$${(analytics?.totalRevenue ?? 0).toLocaleString()}`, icon: CreditCard },
    { label: "Tenant DBs", value: totalDatabases, icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/70 px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="[font-family:var(--font-display)] text-2xl uppercase tracking-wide">Super Admin</h1>
              <p className="text-sm text-white/55">
                {user ? `${user.fullName} - ${user.role}` : "Platform owner dashboard"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link href="/saas/dashboard">Gym Dashboard</Link>
            </Button>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={loadPlatform}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {error ? (
          <div className="mb-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <Icon className="h-5 w-5 text-emerald-300" />
                      <div className="mt-4 text-3xl font-bold">{stat.value}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/55">{stat.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <section className="mt-8">
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle>Create Gym Trial</CardTitle>
                  <p className="text-sm text-white/55">
                    Creates the platform gym record, owner admin account, free trial, and isolated MongoDB database.
                  </p>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={createGym}>
                    <div className="space-y-1.5">
                      <Label>Gym Name</Label>
                      <Input name="gymName" required className="border-white/10 bg-slate-950" placeholder="Powerhouse Gym" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Slug</Label>
                      <Input
                        name="gymSlug"
                        required
                        className="border-white/10 bg-slate-950"
                        placeholder="powerhouse"
                        onChange={(event) => {
                          event.currentTarget.value = event.currentTarget.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]+/g, "-")
                            .replace(/^-+/, "");
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Owner Name</Label>
                      <Input name="ownerName" required className="border-white/10 bg-slate-950" placeholder="Gym Owner" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Owner Email</Label>
                      <Input name="ownerEmail" type="email" required className="border-white/10 bg-slate-950" placeholder="owner@gym.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Admin Password</Label>
                      <Input name="adminPassword" type="password" required minLength={8} className="border-white/10 bg-slate-950" placeholder="Minimum 8 characters" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input name="ownerPhone" className="border-white/10 bg-slate-950" placeholder="+20..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input name="country" className="border-white/10 bg-slate-950" placeholder="Egypt" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input name="city" className="border-white/10 bg-slate-950" placeholder="Cairo" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Trial Days</Label>
                      <Input name="trialDays" type="number" min={1} max={365} defaultValue={30} className="border-white/10 bg-slate-950" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Plan</Label>
                      <Select name="plan" defaultValue="TRIAL">
                        <SelectTrigger className="border-white/10 bg-slate-950">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRIAL">Trial</SelectItem>
                          <SelectItem value="BASIC">Basic</SelectItem>
                          <SelectItem value="PRO">Pro</SelectItem>
                          <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max Members</Label>
                      <Input name="maxMembers" type="number" min={1} className="border-white/10 bg-slate-950" placeholder="300" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max Trainers</Label>
                      <Input name="maxTrainers" type="number" min={1} className="border-white/10 bg-slate-950" placeholder="3" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Storage GB</Label>
                      <Input name="storageLimitGb" type="number" min={1} className="border-white/10 bg-slate-950" placeholder="5" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Custom Domain</Label>
                      <Input name="domain" className="border-white/10 bg-slate-950" placeholder="gym.com" />
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label>Address</Label>
                      <Input name="address" className="border-white/10 bg-slate-950" placeholder="Street address" />
                    </div>
                    <div className="flex items-end xl:col-span-2">
                      <Button className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={creating}>
                        {creating ? "Creating..." : "Create Trial Gym"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>

            <section className="mt-8">
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle>Gyms</CardTitle>
                  <p className="text-sm text-white/55">
                    Manage tenant status, plans, trial windows, and database isolation.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-white/55">
                          <th className="p-3 font-medium">Gym</th>
                          <th className="p-3 font-medium">Owner</th>
                          <th className="p-3 font-medium">Plan</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium">Trial</th>
                          <th className="p-3 font-medium">Members</th>
                          <th className="p-3 font-medium">Database</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gyms.map((gym) => {
                          const trialDays = daysLeft(gym.trialEndDate);
                          return (
                            <tr key={gym.id} className="border-b border-white/10">
                              <td className="p-3">
                                <div className="font-semibold">{gym.name}</div>
                                <div className="text-xs text-white/45">{gym.slug}</div>
                              </td>
                              <td className="p-3 text-white/70">
                                <div>{gym.ownerName ?? "Not set"}</div>
                                <div className="text-xs text-white/45">{gym.ownerEmail ?? "No owner email"}</div>
                              </td>
                              <td className="p-3">
                                <Select value={gym.plan} onValueChange={(value) => updateGym(gym.id, "plan", value)}>
                                  <SelectTrigger className="w-36 border-white/10 bg-slate-950">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TRIAL">Trial</SelectItem>
                                    <SelectItem value="BASIC">Basic</SelectItem>
                                    <SelectItem value="PRO">Pro</SelectItem>
                                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                <Select value={gym.status} onValueChange={(value) => updateGym(gym.id, "status", value)}>
                                  <SelectTrigger className="w-36 border-white/10 bg-slate-950">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                    <SelectItem value="TRIAL">Trial</SelectItem>
                                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                    <SelectItem value="EXPIRED">Expired</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                <Badge className={trialDays !== null && trialDays >= 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}>
                                  {trialDays === null ? "No trial" : trialDays >= 0 ? `${trialDays} days left` : "Expired"}
                                </Badge>
                              </td>
                              <td className="p-3">{gym._count?.members ?? 0}</td>
                              <td className="p-3">
                                <code className="rounded bg-slate-950 px-2 py-1 text-xs text-emerald-200">
                                  {gym.databaseName ?? "pending"}
                                </code>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {gyms.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/55">No gyms created yet.</p>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
