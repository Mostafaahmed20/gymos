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
  Edit2,
  LogOut,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const API_BASE = "https://4000-ip7j6bqy2pdjp23wy2koy-648bfd36.sg1.manus.computer/api/v1";

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
  ownerPhone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  domain?: string | null;
  status: string;
  plan: string;
  trialEndDate: string;
  subscriptionEnd?: string | null;
  databaseName?: string | null;
  maxMembers?: number | null;
  maxTrainers?: number | null;
  storageLimitGb?: number | null;
  createdAt: string;
  _count?: { members: number; users: number };
};

type SessionUser = { fullName: string; email: string; role: string };

function token() { return localStorage.getItem("gymos_access_token"); }
function currentUser() {
  const raw = localStorage.getItem("gymos_user");
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
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
      const details = payload.errors.map((i: { path?: string; message?: string }) => `${i.path ?? "field"}: ${i.message ?? "Invalid"}`).join(", ");
      throw new Error(details || payload.message || "Request failed");
    }
    throw new Error(payload.message ?? "Request failed");
  }
  return payload;
}

function daysLeft(dateValue?: string | null) {
  if (!dateValue) return null;
  return Math.ceil((new Date(dateValue).getTime() - Date.now()) / 86400000);
}

const PLANS = ["TRIAL", "BASIC", "PRO", "PROFESSIONAL", "ENTERPRISE"];
const STATUSES = ["ACTIVE", "INACTIVE", "TRIAL", "SUSPENDED", "EXPIRED", "CANCELLED"];

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditGymModal({ gym, onClose, onSaved }: { gym: Gym; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = e.currentTarget;
    const d = new FormData(form);
    try {
      await apiFetch(`/super-admin/gyms/${gym.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: d.get("name") || undefined,
          ownerName: d.get("ownerName") || undefined,
          ownerEmail: d.get("ownerEmail") || undefined,
          ownerPhone: d.get("ownerPhone") || undefined,
          country: d.get("country") || undefined,
          city: d.get("city") || undefined,
          address: d.get("address") || undefined,
          domain: d.get("domain") || undefined,
          maxMembers: d.get("maxMembers") || undefined,
          maxTrainers: d.get("maxTrainers") || undefined,
          storageLimitGb: d.get("storageLimitGb") || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold">Edit Gym — {gym.name}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Gym Name</Label>
              <Input name="name" defaultValue={gym.name} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Name</Label>
              <Input name="ownerName" defaultValue={gym.ownerName ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Email</Label>
              <Input name="ownerEmail" type="email" defaultValue={gym.ownerEmail ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Phone</Label>
              <Input name="ownerPhone" defaultValue={gym.ownerPhone ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input name="country" defaultValue={gym.country ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input name="city" defaultValue={gym.city ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={gym.address ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Custom Domain</Label>
              <Input name="domain" defaultValue={gym.domain ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Members</Label>
              <Input name="maxMembers" type="number" min={1} defaultValue={gym.maxMembers ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Trainers</Label>
              <Input name="maxTrainers" type="number" min={1} defaultValue={gym.maxTrainers ?? ""} className="border-white/10 bg-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label>Storage GB</Label>
              <Input name="storageLimitGb" type="number" min={1} defaultValue={gym.storageLimitGb ?? ""} className="border-white/10 bg-slate-950" />
            </div>
          </div>
          {error ? <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</div> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/15 bg-white/5 text-white hover:bg-white/10">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Renew Modal ──────────────────────────────────────────────────────────────
function RenewModal({ gym, onClose, onSaved }: { gym: Gym; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState("30");
  const [plan, setPlan] = useState(gym.plan);

  async function handleRenew() {
    setSaving(true);
    setError("");
    try {
      const result = await apiFetch<{ renewedUntil: string }>(`/super-admin/gyms/${gym.id}/renew`, {
        method: "POST",
        body: JSON.stringify({ days: Number(days), plan }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to renew");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold">Renew Subscription — {gym.name}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm space-y-1">
            <div className="text-white/50">Current subscription end</div>
            <div className="font-medium">
              {gym.subscriptionEnd ? new Date(gym.subscriptionEnd).toLocaleDateString() : "No active subscription"}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Extend by (days)</Label>
            <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} className="border-white/10 bg-slate-950" />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="border-white/10 bg-slate-950"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</div> : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/15 bg-white/5 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleRenew} disabled={saving} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
              {saving ? "Renewing..." : `Renew +${days} days`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────
function DeleteConfirm({ gym, onClose, onDeleted }: { gym: Gym; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await apiFetch(`/super-admin/gyms/${gym.id}`, { method: "DELETE" });
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-red-400/20 px-6 py-4">
          <h2 className="text-lg font-bold text-red-300">Delete Gym</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="mt-1 text-red-300/70">Deleting <strong>{gym.name}</strong> will soft-delete the gym and deactivate all its user accounts. The MongoDB tenant database will remain on Atlas but will no longer be accessible through the platform.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Type <span className="font-mono text-red-300">{gym.slug}</span> to confirm</Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={gym.slug} className="border-red-400/30 bg-slate-950" />
          </div>
          {error ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-300">{error}</div> : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/15 bg-white/5 text-white hover:bg-white/10">Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting || confirm !== gym.slug}
              className="bg-red-500 text-white hover:bg-red-400 disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Delete Gym"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editGym, setEditGym] = useState<Gym | null>(null);
  const [renewGym, setRenewGym] = useState<Gym | null>(null);
  const [deleteGym, setDeleteGym] = useState<Gym | null>(null);
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
    if (!token()) { window.location.href = "/saas/login"; return; }
    loadPlatform();
  }, []);

  async function createGym(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const rawSlug = String(data.get("gymSlug") ?? "");
    const normalizedSlug = rawSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
          plan: data.get("plan") || undefined,
          trialDays: data.get("trialDays") || undefined,
          maxMembers: data.get("maxMembers") || undefined,
          maxTrainers: data.get("maxTrainers") || undefined,
          storageLimitGb: data.get("storageLimitGb") || undefined,
        }),
      });
      setMessage("Gym trial created. Admin account and isolated Mongo database are ready.");
      await loadPlatform();
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create gym");
    } finally {
      setCreating(false);
    }
  }

  async function updateGym(gymId: string, field: "status" | "plan", value: string) {
    setError("");
    try {
      await apiFetch(`/super-admin/gyms/${gymId}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
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

  const expiredGyms = gyms.filter((g) => {
    const sub = daysLeft(g.subscriptionEnd);
    const trial = daysLeft(g.trialEndDate);
    return sub !== null ? sub < 0 : trial !== null && trial < 0;
  }).length;
  const trialGyms = gyms.filter((g) => daysLeft(g.trialEndDate) !== null && daysLeft(g.trialEndDate)! >= 0).length;
  const totalDatabases = gyms.filter((g) => g.databaseName).length;

  const stats = [
    { label: "Total Gyms", value: analytics?.totalGyms ?? 0, icon: Building2 },
    { label: "Active Gyms", value: analytics?.activeGyms ?? 0, icon: Activity },
    { label: "Trial Gyms", value: trialGyms, icon: CalendarClock },
    { label: "Expired Gyms", value: expiredGyms, icon: Shield },
    { label: "Total Members", value: analytics?.totalMembers ?? 0, icon: Users },
    { label: "Revenue", value: `$${(analytics?.totalRevenue ?? 0).toLocaleString()}`, icon: CreditCard },
    { label: "Tenant DBs", value: totalDatabases, icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Modals */}
      {editGym ? <EditGymModal gym={editGym} onClose={() => setEditGym(null)} onSaved={loadPlatform} /> : null}
      {renewGym ? <RenewModal gym={renewGym} onClose={() => setRenewGym(null)} onSaved={loadPlatform} /> : null}
      {deleteGym ? <DeleteConfirm gym={deleteGym} onClose={() => setDeleteGym(null)} onDeleted={loadPlatform} /> : null}

      <header className="border-b border-white/10 bg-slate-900/70 px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide">Super Admin</h1>
              <p className="text-sm text-white/55">{user ? `${user.fullName} - ${user.role}` : "Platform owner dashboard"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link href="/saas/dashboard">Gym Dashboard</Link>
            </Button>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={loadPlatform}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </Button>
            <Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {error ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {message ? <div className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
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

            {/* Create Gym Form */}
            <section className="mt-8">
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle>Create Gym Trial</CardTitle>
                  <p className="text-sm text-white/55">Creates the platform gym record, owner admin account, free trial, and isolated MongoDB database.</p>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={createGym}>
                    <div className="space-y-1.5"><Label>Gym Name</Label><Input name="gymName" required className="border-white/10 bg-slate-950" placeholder="Powerhouse Gym" /></div>
                    <div className="space-y-1.5">
                      <Label>Slug</Label>
                      <Input name="gymSlug" required className="border-white/10 bg-slate-950" placeholder="powerhouse"
                        onChange={(e) => { e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, ""); }} />
                    </div>
                    <div className="space-y-1.5"><Label>Owner Name</Label><Input name="ownerName" required className="border-white/10 bg-slate-950" placeholder="Gym Owner" /></div>
                    <div className="space-y-1.5"><Label>Owner Email</Label><Input name="ownerEmail" type="email" required className="border-white/10 bg-slate-950" placeholder="owner@gym.com" /></div>
                    <div className="space-y-1.5"><Label>Admin Password</Label><Input name="adminPassword" type="password" required minLength={8} className="border-white/10 bg-slate-950" placeholder="Min 8 chars" /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input name="ownerPhone" className="border-white/10 bg-slate-950" placeholder="+20..." /></div>
                    <div className="space-y-1.5"><Label>Country</Label><Input name="country" className="border-white/10 bg-slate-950" placeholder="Egypt" /></div>
                    <div className="space-y-1.5"><Label>City</Label><Input name="city" className="border-white/10 bg-slate-950" placeholder="Cairo" /></div>
                    <div className="space-y-1.5"><Label>Trial Days</Label><Input name="trialDays" type="number" min={1} max={365} defaultValue={30} className="border-white/10 bg-slate-950" /></div>
                    <div className="space-y-1.5">
                      <Label>Plan</Label>
                      <Select name="plan" defaultValue="TRIAL">
                        <SelectTrigger className="border-white/10 bg-slate-950"><SelectValue /></SelectTrigger>
                        <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Max Members</Label><Input name="maxMembers" type="number" min={1} className="border-white/10 bg-slate-950" placeholder="300" /></div>
                    <div className="space-y-1.5"><Label>Max Trainers</Label><Input name="maxTrainers" type="number" min={1} className="border-white/10 bg-slate-950" placeholder="10" /></div>
                    <div className="space-y-1.5"><Label>Storage GB</Label><Input name="storageLimitGb" type="number" min={1} className="border-white/10 bg-slate-950" placeholder="5" /></div>
                    <div className="space-y-1.5"><Label>Custom Domain</Label><Input name="domain" className="border-white/10 bg-slate-950" placeholder="gym.com" /></div>
                    <div className="space-y-1.5 xl:col-span-2"><Label>Address</Label><Input name="address" className="border-white/10 bg-slate-950" placeholder="Street address" /></div>
                    <div className="flex items-end xl:col-span-2">
                      <Button className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={creating}>
                        {creating ? <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Creating gym &amp; provisioning database...</span> : "Create Trial Gym"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>

            {/* Gyms Table */}
            <section className="mt-8">
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle>Gyms</CardTitle>
                  <p className="text-sm text-white/55">Manage tenant status, plans, trial windows, and database isolation.</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-white/55">
                          <th className="p-3 font-medium">Gym</th>
                          <th className="p-3 font-medium">Owner</th>
                          <th className="p-3 font-medium">Plan</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium">Trial</th>
                          <th className="p-3 font-medium">Members</th>
                          <th className="p-3 font-medium">Database</th>
                          <th className="p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gyms.map((gym) => {
                          const trialDays = daysLeft(gym.trialEndDate);
                          return (
                            <tr key={gym.id} className="border-b border-white/10 hover:bg-white/[0.02]">
                              <td className="p-3">
                                <div className="font-semibold">{gym.name}</div>
                                <div className="text-xs text-white/45">{gym.slug}</div>
                              </td>
                              <td className="p-3 text-white/70">
                                <div>{gym.ownerName ?? "Not set"}</div>
                                <div className="text-xs text-white/45">{gym.ownerEmail ?? "—"}</div>
                              </td>
                              <td className="p-3">
                                <Select value={gym.plan} onValueChange={(v) => updateGym(gym.id, "plan", v)}>
                                  <SelectTrigger className="w-36 border-white/10 bg-slate-950"><SelectValue /></SelectTrigger>
                                  <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                <Select value={gym.status} onValueChange={(v) => updateGym(gym.id, "status", v)}>
                                  <SelectTrigger className="w-36 border-white/10 bg-slate-950"><SelectValue /></SelectTrigger>
                                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                <Badge className={trialDays !== null && trialDays >= 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}>
                                  {trialDays === null ? "No trial" : trialDays >= 0 ? `${trialDays} days left` : "Expired"}
                                </Badge>
                              </td>
                              <td className="p-3">{gym._count?.members ?? 0}</td>
                              <td className="p-3">
                                <code className="rounded bg-slate-950 px-2 py-1 text-xs text-emerald-200">{gym.databaseName ?? "pending"}</code>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setEditGym(gym)}
                                    title="Edit gym details"
                                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setRenewGym(gym)}
                                    title="Renew subscription"
                                    className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-1.5 text-emerald-300 hover:bg-emerald-400/15"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteGym(gym)}
                                    title="Delete gym"
                                    className="rounded-lg border border-red-400/20 bg-red-400/5 p-1.5 text-red-300 hover:bg-red-400/15"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {gyms.length === 0 ? <p className="py-8 text-center text-sm text-white/55">No gyms created yet.</p> : null}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
