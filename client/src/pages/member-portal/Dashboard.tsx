import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarCheck2,
  CreditCard,
  Dumbbell,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = "https://4000-ip7j6bqy2pdjp23wy2koy-648bfd36.sg1.manus.computer/api/v1";

type MemberSession = {
  id: string;
  code: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  createdAt: string;
};

type GymSession = {
  id: string;
  slug: string;
  name: string;
};

type Membership = {
  id: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: string;
  price: string | number;
  freezeDays: number;
};

type Attendance = {
  id: string;
  checkInAt: string;
  checkOutAt?: string | null;
  method: string;
};

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  paidAt: string;
  notes?: string | null;
};

type Section = "profile" | "membership" | "attendance" | "payments";

function getMemberSession(): MemberSession | null {
  const raw = localStorage.getItem("gymos_member");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function getGymSession(): GymSession | null {
  const raw = localStorage.getItem("gymos_member_gym");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function statusColor(status: string) {
  if (status === "ACTIVE") return "bg-emerald-400/15 text-emerald-300 border-emerald-400/30";
  if (status === "FROZEN") return "bg-blue-400/15 text-blue-300 border-blue-400/30";
  if (status === "EXPIRED") return "bg-red-400/15 text-red-300 border-red-400/30";
  return "bg-white/10 text-white/60 border-white/10";
}

export default function MemberPortalDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const member = getMemberSession();
  const gym = getGymSession();

  useEffect(() => {
    if (!member || !gym) {
      window.location.href = "/member-portal/login";
    }
  }, []);

  useEffect(() => {
    if (!member || !gym) return;
    loadSection(activeSection);
  }, [activeSection]);

  async function loadSection(section: Section) {
    if (section === "profile") return;
    setLoading(true);
    setError("");
    const base = `${API_BASE}/member-portal/${gym!.slug}/${member!.id}`;
    try {
      if (section === "membership") {
        const res = await fetch(`${base}/memberships`);
        const data = await res.json();
        setMemberships(data.data ?? []);
      } else if (section === "attendance") {
        const res = await fetch(`${base}/attendance?pageSize=50`);
        const data = await res.json();
        setAttendance(data.data ?? []);
      } else if (section === "payments") {
        const res = await fetch(`${base}/payments`);
        const data = await res.json();
        setPayments(data.data ?? []);
      }
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("gymos_member");
    localStorage.removeItem("gymos_member_gym");
    window.location.href = "/member-portal/login";
  }

  if (!member || !gym) return null;

  const activeMembership = memberships.find((m) => m.status === "ACTIVE");

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
    { id: "membership", label: "Membership", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "attendance", label: "Attendance", icon: <CalendarCheck2 className="h-4 w-4" /> },
    { id: "payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15">
            <Dumbbell className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold leading-none">{gym.name}</div>
            <div className="text-xs text-white/50">Member Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-white/60 sm:block">{member.fullName}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Welcome Banner */}
        <div className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-bold">Welcome back, {member.fullName.split(" ")[0]}!</div>
              <div className="text-sm text-white/50">Member Code: <span className="font-mono text-emerald-300">{member.code}</span></div>
            </div>
            <div className="text-sm text-white/50">
              Member since {new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-emerald-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Error */}
        {error ? (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {/* Profile Section */}
        {activeSection === "profile" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {([
                  ["Full Name", member.fullName],
                  ["Member Code", member.code],
                  ["Email", member.email ?? "—"],
                  ["Phone", member.phone ?? "—"],
                  ["Gender", member.gender ?? "—"],
                  ["Date of Birth", member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "—"],
                  ["Member Since", new Date(member.createdAt).toLocaleDateString()],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/50">{label}</span>
                    <span className={`font-medium ${label === "Member Code" ? "font-mono text-emerald-300" : ""}`}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader><CardTitle>Gym Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {([
                  ["Gym Name", gym.name],
                  ["Gym Slug", gym.slug],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/50">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                {member.notes ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-slate-950 p-3">
                    <div className="text-xs text-white/50 mb-1">Notes from gym</div>
                    <div className="text-sm">{member.notes}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Membership Section */}
        {activeSection === "membership" ? (
          <div className="space-y-4">
            {loading ? (
              <p className="text-white/50">Loading memberships...</p>
            ) : memberships.length === 0 ? (
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardContent className="p-8 text-center text-white/50">
                  No memberships found. Contact your gym admin.
                </CardContent>
              </Card>
            ) : (
              memberships.map((m) => {
                const days = daysUntil(m.endDate);
                return (
                  <Card key={m.id} className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="text-lg font-bold">{m.planName}</div>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(m.status)}`}>
                              {m.status}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/60">
                            <span>Start: {new Date(m.startDate).toLocaleDateString()}</span>
                            <span>End: {new Date(m.endDate).toLocaleDateString()}</span>
                            <span>Price: ${Number(m.price).toLocaleString()}</span>
                            {m.freezeDays > 0 ? <span>Frozen: {m.freezeDays} days</span> : null}
                          </div>
                        </div>
                        {m.status === "ACTIVE" ? (
                          <div className={`rounded-xl px-4 py-3 text-center ${days > 7 ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                            <div className="text-2xl font-bold">{days > 0 ? days : 0}</div>
                            <div className="text-xs">{days > 0 ? "days left" : "expired"}</div>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : null}

        {/* Attendance Section */}
        {activeSection === "attendance" ? (
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <p className="text-sm text-white/50">Your recent gym visits</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-white/50">Loading attendance...</p>
              ) : attendance.length === 0 ? (
                <p className="text-sm text-white/50">No attendance records yet.</p>
              ) : (
                attendance.map((item) => {
                  const duration = item.checkOutAt
                    ? Math.round((new Date(item.checkOutAt).getTime() - new Date(item.checkInAt).getTime()) / 60000)
                    : null;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 p-4">
                      <div>
                        <div className="font-medium">{new Date(item.checkInAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
                        <div className="mt-0.5 text-xs text-white/50">
                          In: {new Date(item.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {item.checkOutAt ? ` · Out: ${new Date(item.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                          {duration ? ` · ${duration} min` : ""}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.checkOutAt ? "border-white/10 bg-white/5 text-white/50" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"}`}>
                        {item.checkOutAt ? "Completed" : "Active"}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Payments Section */}
        {activeSection === "payments" ? (
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <p className="text-sm text-white/50">All payments recorded for your account</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-white/50">Loading payments...</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-white/50">No payment records found.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div>
                      <div className="font-medium">{new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      <div className="mt-0.5 text-xs text-white/50">
                        {p.method}{p.notes ? ` · ${p.notes}` : ""}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-emerald-300">${Number(p.amount).toLocaleString()}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
