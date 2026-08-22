import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SAAS_API_BASE } from "@/lib/saas-api";
import {
  Activity,
  Bell,
  CalendarCheck2,
  Camera,
  CreditCard,
  QrCode,
  RefreshCw,
  Dumbbell,
  LogOut,
  Plus,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEffect, useState } from "react";

const API_BASE = SAAS_API_BASE;

type MemberSession = {
  id: string;
  code: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  nationalId?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  occupation?: string | null;
  address?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  medicalNotes?: string | null;
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

type ProgressRecord = {
  id: string;
  measuredAt: string;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  notes?: string | null;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type AttendanceQrPass = {
  member: { id: string; code: string; fullName: string };
  qrValue: string;
  qrImageDataUrl: string;
  expiresAt: string;
  refreshAfterSeconds: number;
};

type WorkoutAssignment = {
  id: string;
  assignedAt: string;
  coach?: { fullName: string } | null;
  workoutPlan: { name: string; details?: { description?: string; exercises?: Array<{ name: string; sets?: string; reps?: string; notes?: string }> } | null };
};

type DietAssignment = {
  id: string;
  assignedAt: string;
  dietPlan: { name: string; details?: { description?: string; meals?: Array<{ name: string; time?: string; foods: string; calories?: number }> } | null };
};

type Section = "profile" | "membership" | "plans" | "qr" | "attendance" | "payments" | "progress" | "notifications";

function getMemberSession(): MemberSession | null {
  const raw = localStorage.getItem("gymos_member");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function refreshMemberToken() {
  const refreshToken = localStorage.getItem("gymos_member_refresh_token");
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/member-portal/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const payload = await response.json();
    localStorage.setItem("gymos_member_access_token", payload.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  let token = localStorage.getItem("gymos_member_access_token");
  let response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshMemberToken();
    if (refreshed) {
      token = localStorage.getItem("gymos_member_access_token");
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });
    } else {
      window.location.href = "/member-portal/login";
      throw new Error("Session expired");
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }
  return payload;
}

function getGymSession(): GymSession | null {
  const raw = localStorage.getItem("gymos_member_gym");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function assetUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, API_BASE.replace(/\/api\/v1\/?$/, "/")).toString();
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
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendanceQr, setAttendanceQr] = useState<AttendanceQrPass | null>(null);
  const [workoutAssignments, setWorkoutAssignments] = useState<WorkoutAssignment[]>([]);
  const [dietAssignments, setDietAssignments] = useState<DietAssignment[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [newProgress, setNewProgress] = useState({
    weightKg: "",
    bodyFatPercent: "",
    notes: "",
  });

  const member = getMemberSession();
  const gym = getGymSession();

  useEffect(() => {
    if (!member || !gym) {
      window.location.href = "/member-portal/login";
      return;
    }
    loadSection("membership");
  }, []);

  useEffect(() => {
    if (!member || !gym) return;
    loadSection(activeSection);
  }, [activeSection]);

  async function loadAttendanceQr() {
    if (!member || !gym) return;
    setQrLoading(true);
    setError("");
    try {
      const pass = await apiFetch<AttendanceQrPass>(`/member-portal/${gym.slug}/${member.id}/attendance-qr`);
      setAttendanceQr(pass);
    } catch {
      setError("Could not generate your QR pass. Please try again.");
    } finally {
      setQrLoading(false);
    }
  }

  async function loadSection(section: Section) {
    if (section === "profile") return;
    if (section === "qr") {
      await loadAttendanceQr();
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (section === "membership") {
        const data = await apiFetch<{ data: Membership[] }>(`/member-portal/${gym!.slug}/${member!.id}/memberships`);
        setMemberships(data.data ?? []);
      } else if (section === "attendance") {
        const data = await apiFetch<{ data: Attendance[] }>(`/member-portal/${gym!.slug}/${member!.id}/attendance?pageSize=50`);
        setAttendance(data.data ?? []);
      } else if (section === "payments") {
        const data = await apiFetch<{ data: Payment[] }>(`/member-portal/${gym!.slug}/${member!.id}/payments`);
        setPayments(data.data ?? []);
      } else if (section === "progress") {
        const data = await apiFetch<{ data: ProgressRecord[] }>(`/member-portal/${gym!.slug}/${member!.id}/progress`);
        setProgressRecords(data.data ?? []);
      } else if (section === "notifications") {
        const data = await apiFetch<{ data: Notification[] }>(`/member-portal/${gym!.slug}/${member!.id}/notifications`);
        setNotifications(data.data ?? []);
      } else if (section === "plans") {
        const [workouts, diets] = await Promise.all([
          apiFetch<{ data: WorkoutAssignment[] }>(`/member-portal/${gym!.slug}/${member!.id}/workouts`),
          apiFetch<{ data: DietAssignment[] }>(`/member-portal/${gym!.slug}/${member!.id}/diets`),
        ]);
        setWorkoutAssignments(workouts.data ?? []);
        setDietAssignments(diets.data ?? []);
      }
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProgress(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch<{ progress: ProgressRecord }>(`/member-portal/${gym!.slug}/${member!.id}/progress`, {
        method: "POST",
        body: JSON.stringify({
          weightKg: newProgress.weightKg ? parseFloat(newProgress.weightKg) : null,
          bodyFatPercent: newProgress.bodyFatPercent ? parseFloat(newProgress.bodyFatPercent) : null,
          notes: newProgress.notes,
        }),
      });
      setProgressRecords([data.progress, ...progressRecords]);
      setShowProgressForm(false);
      setNewProgress({ weightKg: "", bodyFatPercent: "", notes: "" });
    } catch (err) {
      setError("Failed to save progress. Please try again.");
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
  const activeMembershipDays = activeMembership ? Math.max(0, daysUntil(activeMembership.endDate)) : null;

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
    { id: "membership", label: "Membership", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "progress", label: "My Progress", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "plans", label: "My Plans", icon: <Dumbbell className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "qr", label: "My QR Pass", icon: <QrCode className="h-4 w-4" /> },
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {assetUrl(member.photoUrl) ? (
                <img src={assetUrl(member.photoUrl)!} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-300/30" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white/60 ring-1 ring-white/10">
                  <User className="h-7 w-7" />
                </div>
              )}
              <div>
                <div className="text-lg font-bold">Welcome back, {member.fullName.split(" ")[0]}!</div>
                <div className="text-sm text-white/50">Member Code: <span className="font-mono text-emerald-300">{member.code}</span></div>
              </div>
            </div>
            <div className="text-left text-sm sm:text-right">
              {activeMembership ? (
                <>
                  <div className={activeMembershipDays !== null && activeMembershipDays <= 7 ? "font-semibold text-amber-300" : "font-semibold text-emerald-300"}>
                    {activeMembershipDays} days left
                  </div>
                  <div className="text-white/50">Ends {new Date(activeMembership.endDate).toLocaleDateString()}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-white/70">No active membership</div>
                  <div className="text-white/50">Member since {new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
                </>
              )}
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
                  ["National ID", member.nationalId ?? "—"],
                  ["Height", member.heightCm ? `${member.heightCm} cm` : "—"],
                  ["Weight", member.weightKg ? `${member.weightKg} kg` : "—"],
                  ["Blood Type", member.bloodType ?? "—"],
                  ["Occupation", member.occupation ?? "—"],
                  ["Gender", member.gender ?? "—"],
                  ["Date of Birth", member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "—"],
                  ["Address", member.address ?? "—"],
                  ["Member Since", new Date(member.createdAt).toLocaleDateString()],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/50">{label}</span>
                    <span className={`font-medium ${label === "Member Code" ? "font-mono text-emerald-300" : ""}`}>{value}</span>
                  </div>
                ))}
                {member.medicalNotes ? (
                  <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                    <div className="mb-1 text-xs text-amber-200/80">Medical Notes</div>
                    <div className="text-sm">{member.medicalNotes}</div>
                  </div>
                ) : null}
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

        {/* Assigned Plans */}
        {activeSection === "plans" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-emerald-300" /> My Workout Plans</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loading ? <p className="text-sm text-white/50">Loading workout plans...</p> : workoutAssignments.length === 0 ? <p className="text-sm text-white/50">No workout plan has been assigned yet.</p> : workoutAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{assignment.workoutPlan.name}</div>{assignment.coach?.fullName ? <div className="mt-1 text-xs text-emerald-200">Coach: {assignment.coach.fullName}</div> : null}</div><span className="text-xs text-white/45">{new Date(assignment.assignedAt).toLocaleDateString()}</span></div>
                    {assignment.workoutPlan.details?.description ? <p className="mt-3 text-sm text-white/60">{assignment.workoutPlan.details.description}</p> : null}
                    <div className="mt-3 space-y-2">{assignment.workoutPlan.details?.exercises?.map((exercise, index) => <div key={`${exercise.name}-${index}`} className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"><span className="font-medium">{exercise.name}</span>{exercise.sets || exercise.reps ? <span className="ml-2 text-white/55">{[exercise.sets && `${exercise.sets} sets`, exercise.reps && `${exercise.reps} reps`].filter(Boolean).join(" · ")}</span> : null}{exercise.notes ? <div className="mt-1 text-xs text-white/45">{exercise.notes}</div> : null}</div>)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-300" /> My Nutrition Plans</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loading ? <p className="text-sm text-white/50">Loading nutrition plans...</p> : dietAssignments.length === 0 ? <p className="text-sm text-white/50">No nutrition plan has been assigned yet.</p> : dietAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="font-semibold">{assignment.dietPlan.name}</div><span className="text-xs text-white/45">{new Date(assignment.assignedAt).toLocaleDateString()}</span></div>
                    {assignment.dietPlan.details?.description ? <p className="mt-3 text-sm text-white/60">{assignment.dietPlan.details.description}</p> : null}
                    <div className="mt-3 space-y-2">{assignment.dietPlan.details?.meals?.map((meal, index) => <div key={`${meal.name}-${index}`} className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{meal.name}</span><span className="text-xs text-emerald-200">{meal.time ?? "Any time"}{meal.calories !== undefined ? ` · ${meal.calories} kcal` : ""}</span></div><div className="mt-1 text-xs text-white/55">{meal.foods}</div></div>)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* QR Attendance Pass */}
        {activeSection === "qr" ? (
          <Card className="border-emerald-400/20 bg-white/[0.04] text-white">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-emerald-300" /> My QR Check-in Pass</CardTitle>
                  <p className="mt-1 text-sm text-white/50">Show this secure pass to reception when you arrive.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadAttendanceQr()}
                  disabled={qrLoading}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${qrLoading ? "animate-spin" : ""}`} />
                  Refresh pass
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {qrLoading && !attendanceQr ? (
                <div className="py-14 text-center text-sm text-white/50">Generating your secure QR pass…</div>
              ) : attendanceQr ? (
                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
                  <div className="space-y-3">
                    <div className="text-xl font-bold">{member.fullName}</div>
                    <div className="font-mono text-sm text-emerald-300">{member.code}</div>
                    <p className="max-w-lg text-sm leading-6 text-white/60">
                      This pass is signed for <strong className="text-white">{gym.name}</strong> and expires at {new Date(attendanceQr.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Refresh it if reception tells you it has expired.
                    </p>
                    <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100/80">
                      For your security, reception must scan the code from a signed-in GymOS account. A screenshot may expire quickly.
                    </div>
                  </div>
                  <div className="mx-auto rounded-2xl bg-white p-3 shadow-xl shadow-emerald-500/10">
                    <img src={attendanceQr.qrImageDataUrl} alt="Secure QR check-in pass" className="h-52 w-52" />
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="mb-3 text-sm text-white/55">Your QR pass is not available yet.</p>
                  <Button onClick={() => void loadAttendanceQr()} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">Generate pass</Button>
                </div>
              )}
            </CardContent>
          </Card>
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

        {/* Progress Section */}
        {activeSection === "progress" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">My Progress</h2>
                <p className="text-white/50 text-sm">Track your body metrics and transformations</p>
              </div>
              <Button 
                onClick={() => setShowProgressForm(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Plus className="mr-2 h-4 w-4" /> Record Progress
              </Button>
            </div>

            {/* Chart Card */}
            {progressRecords.length > 1 && (
              <Card className="border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    Weight & Body Fat Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ChartContainer
                      config={{
                        weight: { label: "Weight (kg)", color: "hsl(var(--emerald-400))" },
                        bodyFat: { label: "Body Fat (%)", color: "hsl(var(--blue-400))" },
                      }}
                    >
                      <AreaChart
                        data={[...progressRecords].reverse().map(r => ({
                          date: new Date(r.measuredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                          weight: r.weightKg,
                          bodyFat: r.bodyFatPercent,
                        }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorBodyFat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.5)" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="weight" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorWeight)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="bodyFat" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorBodyFat)" 
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Records List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading && progressRecords.length === 0 ? (
                <p className="text-white/50 col-span-full">Loading progress records...</p>
              ) : progressRecords.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.04] text-white col-span-full">
                  <CardContent className="p-12 text-center text-white/50">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="h-12 w-12 opacity-20" />
                      <p>No progress records yet. Start tracking your journey today!</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowProgressForm(true)}
                        className="mt-4 border-white/10 hover:bg-white/5"
                      >
                        Add Your First Record
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                progressRecords.map((record) => (
                  <Card key={record.id} className="border-white/10 bg-white/[0.04] text-white overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-white/50">
                        {new Date(record.measuredAt).toLocaleDateString("en-US", { 
                          weekday: "long", 
                          month: "long", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">{record.weightKg ?? "--"} <span className="text-xs font-normal text-white/50">kg</span></div>
                          <div className="text-xs text-white/50">Weight</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{record.bodyFatPercent ?? "--"} <span className="text-xs font-normal text-white/50">%</span></div>
                          <div className="text-xs text-white/50">Body Fat</div>
                        </div>
                      </div>
                      
                      {record.notes && (
                        <div className="rounded-lg bg-slate-950/50 p-3 text-sm text-white/70 italic">
                          "{record.notes}"
                        </div>
                      )}

                      {(record.beforePhotoUrl || record.afterPhotoUrl) && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {record.beforePhotoUrl && (
                            <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-slate-900">
                              <img src={record.beforePhotoUrl} alt="Before" className="object-cover w-full h-full" />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] font-bold">BEFORE</div>
                            </div>
                          )}
                          {record.afterPhotoUrl && (
                            <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-slate-900">
                              <img src={record.afterPhotoUrl} alt="After" className="object-cover w-full h-full" />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] font-bold text-emerald-400">AFTER</div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Record Progress Form Modal (Simple Overlay) */}
            {showProgressForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white shadow-2xl">
                  <CardHeader>
                    <CardTitle>Record Your Progress</CardTitle>
                    <p className="text-sm text-white/50">Update your stats to track your fitness journey</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateProgress} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/70">Weight (kg)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={newProgress.weightKg}
                            onChange={e => setNewProgress({...newProgress, weightKg: e.target.value})}
                            className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:border-emerald-500 focus:outline-none"
                            placeholder="75.0"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/70">Body Fat (%)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={newProgress.bodyFatPercent}
                            onChange={e => setNewProgress({...newProgress, bodyFatPercent: e.target.value})}
                            className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:border-emerald-500 focus:outline-none"
                            placeholder="15.5"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Notes / Feelings</label>
                        <textarea 
                          value={newProgress.notes}
                          onChange={e => setNewProgress({...newProgress, notes: e.target.value})}
                          className="w-full min-h-[100px] rounded-md border border-white/10 bg-white/5 p-2 text-white focus:border-emerald-500 focus:outline-none"
                          placeholder="How are you feeling? Any achievements today?"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowProgressForm(false)}
                          className="flex-1 border-white/10 hover:bg-white/5 text-white"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {loading ? "Saving..." : "Save Record"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : null}

        {/* Notifications Section */}
        {activeSection === "notifications" ? (
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-400" />
                Gym Announcements
              </CardTitle>
              <p className="text-sm text-white/50">Stay updated with the latest gym offers and news</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && notifications.length === 0 ? (
                <p className="text-white/50">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-white/40">
                  <Bell className="mx-auto h-12 w-12 opacity-10 mb-2" />
                  <p>No new notifications at the moment.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4 transition hover:bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-emerald-300">{n.title}</h3>
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{n.message}</p>
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
