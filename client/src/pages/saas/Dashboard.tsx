import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SAAS_API_BASE } from "@/lib/saas-api";
import {
  Activity,
  CalendarCheck2,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_BASE = SAAS_API_BASE;

type Stats = {
  totalMembers: number;
  activeMemberships: number;
  expiredMemberships: number;
  monthlyRevenue: number;
  todayAttendance: number;
  newMembers: number;
};

type Member = {
  id: string;
  code: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

type Coach = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
};

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  paidAt: string;
  notes?: string | null;
  member?: { fullName: string; code: string } | null;
};

type Attendance = {
  id: string;
  checkInAt: string;
  checkOutAt?: string | null;
  member?: { fullName: string; code: string } | null;
};

type UserSession = {
  fullName: string;
  email: string;
  role: string;
};

type GymInfo = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  status: string;
  plan: string;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  subscriptionEnd?: string | null;
  maxMembers: number;
  maxTrainers: number;
  storageLimitGb: number;
  databaseName?: string | null;
  createdAt: string;
};

type Section = "overview" | "members" | "trainers" | "attendance" | "payments" | "settings";

function getAccessToken() {
  return localStorage.getItem("gymos_access_token");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }
  return payload;
}

function readSession() {
  const raw = localStorage.getItem("gymos_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export default function SaasDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const session = useMemo(readSession, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [statsPayload, membersPayload, coachesPayload, paymentsPayload, attendancePayload, gymPayload] = await Promise.all([
        apiFetch<Stats>("/dashboard/stats"),
        apiFetch<{ data: Member[] }>("/members?pageSize=50"),
        apiFetch<{ data: Coach[] }>("/coaches"),
        apiFetch<{ data: Payment[] }>("/payments?pageSize=20"),
        apiFetch<{ data: Attendance[] }>("/attendance?pageSize=20"),
        apiFetch<{ gym: GymInfo }>("/gyms/me"),
      ]);

      setStats(statsPayload);
      setMembers(membersPayload.data);
      setCoaches(coachesPayload.data);
      setPayments(paymentsPayload.data);
      setAttendance(attendancePayload.data);
      setGymInfo(gymPayload.gym);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/saas/login";
      return;
    }
    loadDashboard();
  }, []);

  const filteredMembers = members.filter((member) => {
    const term = search.toLowerCase();
    return (
      member.fullName.toLowerCase().includes(term) ||
      member.code.toLowerCase().includes(term) ||
      member.email?.toLowerCase().includes(term) ||
      member.phone?.toLowerCase().includes(term)
    );
  });

  async function createMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await apiFetch("/members", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.get("fullName"),
          email: data.get("email") || undefined,
          phone: data.get("phone") || undefined,
        }),
      });
      setMessage("Member added successfully.");
      await loadDashboard();
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not add member");
    }
  }

  async function createCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await apiFetch("/coaches", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.get("fullName"),
          email: data.get("email") || undefined,
          phone: data.get("phone") || undefined,
        }),
      });
      setMessage("Trainer added successfully.");
      await loadDashboard();
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not add trainer");
    }
  }

  async function createPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          memberId: data.get("memberId") || undefined,
          amount: Number(data.get("amount")),
          method: data.get("method"),
          notes: data.get("notes") || undefined,
        }),
      });
      setMessage("Payment recorded successfully.");
      await loadDashboard();
      form.reset();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Could not record payment");
    }
  }

  async function checkIn(memberId: string) {
    setMessage("");
    setError("");
    try {
      await apiFetch("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({ memberId, method: "MANUAL" }),
      });
      setMessage("Attendance check-in recorded.");
      await loadDashboard();
    } catch (checkInError) {
      setError(checkInError instanceof Error ? checkInError.message : "Could not check in member");
    }
  }

  function logout() {
    localStorage.removeItem("gymos_access_token");
    localStorage.removeItem("gymos_refresh_token");
    localStorage.removeItem("gymos_user");
    window.location.href = "/saas/login";
  }

  const navItems = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "members" as const, label: "Members", icon: Users },
    { id: "trainers" as const, label: "Trainers", icon: UserCheck },
    { id: "attendance" as const, label: "Attendance", icon: CalendarCheck2 },
    { id: "payments" as const, label: "Payments", icon: CreditCard },
    { id: "settings" as const, label: "Tenant", icon: ShieldCheck },
  ];

  const statCards = [
    { label: "Total Members", value: stats?.totalMembers ?? 0, icon: Users },
    { label: "Active Memberships", value: stats?.activeMemberships ?? 0, icon: Activity },
    { label: "Monthly Revenue", value: `$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, icon: CreditCard },
    { label: "Today Attendance", value: stats?.todayAttendance ?? 0, icon: CalendarCheck2 },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-900/70 p-5 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold tracking-wide">GYMOS</div>
            <div className="text-xs text-white/55">Tenant workspace</div>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  activeSection === item.id ? "bg-emerald-400 text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="[font-family:var(--font-display)] text-3xl uppercase tracking-wide">Gym Admin Dashboard</h1>
            <p className="mt-1 text-sm text-white/60">
              {session ? `${session.fullName} - ${session.role}` : "Owner workspace"} · API-backed tenant tools
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={loadDashboard}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "outline"}
              className={activeSection === item.id ? "bg-emerald-400 text-slate-950" : "border-white/15 bg-white/5 text-white"}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {error ? <div className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {message ? <div className="mt-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : null}

        {!loading && activeSection === "overview" ? (
          <section className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((stat) => {
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
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="border-white/10 bg-white/[0.04] text-white xl:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {members.slice(0, 6).map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 p-3">
                      <div>
                        <div className="font-medium">{member.fullName}</div>
                        <div className="text-xs text-white/50">{member.code} · {member.phone ?? member.email ?? "No contact"}</div>
                      </div>
                      <Button size="sm" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" onClick={() => checkIn(member.id)}>
                        Check In
                      </Button>
                    </div>
                  ))}
                  {members.length === 0 ? <p className="text-sm text-white/55">No members yet. Add your first member from the Members section.</p> : null}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle>Workspace Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Tenant API</span>
                    <Badge className="bg-emerald-400/15 text-emerald-200">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Members</span>
                    <span>{members.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Trainers</span>
                    <span>{coaches.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "members" ? (
          <section className="mt-8 grid gap-5 xl:grid-cols-[380px_1fr]">
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Add Member</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createMember}>
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input name="fullName" required className="border-white/10 bg-slate-950" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input name="email" type="email" className="border-white/10 bg-slate-950" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input name="phone" className="border-white/10 bg-slate-950" />
                  </div>
                  <Button className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <Input className="border-white/10 bg-slate-950 pl-9" placeholder="Search members" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold">{member.fullName}</div>
                      <div className="mt-1 text-xs text-white/55">{member.code} · {member.email ?? "No email"} · {member.phone ?? "No phone"}</div>
                    </div>
                    <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => checkIn(member.id)}>
                      Check In
                    </Button>
                  </div>
                ))}
                {filteredMembers.length === 0 ? <p className="text-sm text-white/55">No members found.</p> : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!loading && activeSection === "trainers" ? (
          <section className="mt-8 grid gap-5 xl:grid-cols-[380px_1fr]">
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Add Trainer</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createCoach}>
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input name="fullName" required className="border-white/10 bg-slate-950" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input name="email" type="email" className="border-white/10 bg-slate-950" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input name="phone" className="border-white/10 bg-slate-950" />
                  </div>
                  <Button className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Trainer
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Trainers</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {coaches.map((coach) => (
                  <div key={coach.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div className="font-semibold">{coach.fullName}</div>
                    <div className="mt-1 text-xs text-white/55">{coach.email ?? "No email"}</div>
                    <div className="text-xs text-white/55">{coach.phone ?? "No phone"}</div>
                  </div>
                ))}
                {coaches.length === 0 ? <p className="text-sm text-white/55">No trainers yet.</p> : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!loading && activeSection === "attendance" ? (
          <section className="mt-8">
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Attendance Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendance.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div>
                      <div className="font-medium">{item.member?.fullName ?? "Unknown member"}</div>
                      <div className="text-xs text-white/55">In: {new Date(item.checkInAt).toLocaleString()}</div>
                    </div>
                    <Badge className={item.checkOutAt ? "bg-white/10 text-white/70" : "bg-emerald-400/15 text-emerald-200"}>
                      {item.checkOutAt ? "Checked out" : "Inside"}
                    </Badge>
                  </div>
                ))}
                {attendance.length === 0 ? <p className="text-sm text-white/55">No attendance records yet. Check in a member from Members.</p> : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!loading && activeSection === "payments" ? (
          <section className="mt-8 grid gap-5 xl:grid-cols-[380px_1fr]">
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Record Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createPayment}>
                  <div className="space-y-1.5">
                    <Label>Member (optional)</Label>
                    <select
                      name="memberId"
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="">— General / Walk-in —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName} ({m.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount ($)</Label>
                    <Input name="amount" type="number" min="1" step="0.01" required className="border-white/10 bg-slate-950" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Method</Label>
                    <select
                      name="method"
                      required
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Input name="notes" className="border-white/10 bg-slate-950" placeholder="e.g. Monthly membership fee" />
                  </div>
                  <Button className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div>
                      <div className="font-medium">{payment.member?.fullName ?? "General payment"}</div>
                      <div className="text-xs text-white/55">
                        {payment.method} · {new Date(payment.paidAt).toLocaleString()}
                        {payment.notes ? ` · ${payment.notes}` : ""}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-emerald-300">${Number(payment.amount).toLocaleString()}</div>
                  </div>
                ))}
                {payments.length === 0 ? <p className="text-sm text-white/55">No payments recorded yet. Use the form to record your first payment.</p> : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!loading && activeSection === "settings" ? (
          <section className="mt-8 space-y-5">
            {gymInfo ? (
              <>
                {/* Status Banner */}
                <div className={`rounded-xl border px-5 py-4 ${
                  gymInfo.status === "TRIAL"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : gymInfo.status === "ACTIVE"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-red-400/30 bg-red-400/10 text-red-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">{gymInfo.name}</div>
                      <div className="text-sm opacity-80">Slug: {gymInfo.slug}</div>
                    </div>
                    <div className="rounded-full border border-current px-3 py-1 text-sm font-semibold">
                      {gymInfo.status}
                    </div>
                  </div>
                </div>

                {/* Plan & Trial Info */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-widest text-white/50">Plan</div>
                      <div className="mt-2 text-2xl font-bold text-emerald-300">{gymInfo.plan}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-widest text-white/50">Trial Ends</div>
                      <div className="mt-2 text-2xl font-bold">
                        {gymInfo.trialEndDate
                          ? (() => {
                              const days = Math.ceil((new Date(gymInfo.trialEndDate).getTime() - Date.now()) / 86400000);
                              return days > 0
                                ? <span className="text-amber-300">{days} days left</span>
                                : <span className="text-red-400">Expired</span>;
                            })()
                          : <span className="text-white/40">N/A</span>}
                      </div>
                      {gymInfo.trialEndDate ? (
                        <div className="mt-1 text-xs text-white/40">{new Date(gymInfo.trialEndDate).toLocaleDateString()}</div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-widest text-white/50">Max Members</div>
                      <div className="mt-2 text-2xl font-bold">{gymInfo.maxMembers}</div>
                      <div className="mt-1 text-xs text-white/40">{members.length} used</div>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-widest text-white/50">Max Trainers</div>
                      <div className="mt-2 text-2xl font-bold">{gymInfo.maxTrainers}</div>
                      <div className="mt-1 text-xs text-white/40">{coaches.length} used</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gym Details */}
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-white/10 bg-white/[0.04] text-white">
                    <CardHeader><CardTitle>Gym Details</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {([
                        ["Owner", gymInfo.ownerName],
                        ["Owner Email", gymInfo.ownerEmail],
                        ["Phone", gymInfo.ownerPhone ?? "—"],
                        ["Country", gymInfo.country ?? "—"],
                        ["City", gymInfo.city ?? "—"],
                        ["Address", gymInfo.address ?? "—"],
                        ["Member Since", new Date(gymInfo.createdAt).toLocaleDateString()],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-white/50">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/[0.04] text-white">
                    <CardHeader><CardTitle>Database & Isolation</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
                        <div className="text-xs text-white/50 mb-1">Tenant Database Name</div>
                        <div className="font-mono text-emerald-300 break-all">{gymInfo.databaseName ?? "Provisioning..."}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
                        <div className="text-xs text-white/50 mb-1">Storage Limit</div>
                        <div className="font-medium">{gymInfo.storageLimitGb} GB</div>
                      </div>
                      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                        <div className="text-xs text-emerald-300 font-semibold mb-1">Isolation Status</div>
                        <div className="text-xs text-white/60">Your data is fully isolated in a dedicated MongoDB database. No other gym can access your records.</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardContent className="p-8 text-center text-white/50">Loading tenant information...</CardContent>
              </Card>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
