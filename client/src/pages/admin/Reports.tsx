import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308"];

export default function AdminReports() {
  const { t } = useLanguage();
  const revenueQuery = trpc.reports.revenue.useQuery({ months: 12 });
  const subscriptionsQuery = trpc.reports.subscriptions.useQuery();
  const supplementsQuery = trpc.reports.supplements.useQuery();
  const attendanceQuery = trpc.reports.attendance.useQuery({});

  const revenue = revenueQuery.data;
  const subs = subscriptionsQuery.data;
  const supps = supplementsQuery.data;
  const attendance = attendanceQuery.data;

  const attendanceByDate = attendance?.data?.reduce<Record<string, number>>((acc, item) => {
    const raw = item.checkInDate ?? item.checkInTime;
    const date = new Date(raw as unknown as string | number | Date);
    const key = Number.isNaN(date.getTime()) ? "Unknown" : date.toISOString().slice(0, 10);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const attendanceChartData = Object.entries(attendanceByDate ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  const subscriptionPieData = subs
    ? [
        { name: "Active", value: subs.active },
        { name: "Expired", value: subs.expired },
        { name: "Other", value: Math.max(0, subs.total - subs.active - subs.expired) },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <AdminLayout title="Reports & Analytics">
      <Tabs defaultValue="revenue">
        <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="supplements">Store</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: `$${revenue?.stats?.total?.toLocaleString() ?? 0}` },
              { label: "Monthly Revenue", value: `$${revenue?.stats?.monthly?.toLocaleString() ?? 0}` },
              { label: "Revenue Months", value: revenue?.monthly?.length ?? 0 },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Monthly Revenue (12 months)</CardTitle></CardHeader>
            <CardContent>
              {revenueQuery.isLoading ? (
                <div className="h-64 bg-secondary/30 rounded animate-pulse" />
              ) : (revenue?.monthly?.length ?? 0) === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No revenue data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenue?.monthly ?? []}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                    <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                    <Bar dataKey="revenue" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{attendance?.total ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Check-ins</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{attendanceChartData.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Days with Activity</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Daily Attendance (last 14 days)</CardTitle></CardHeader>
            <CardContent>
              {attendanceQuery.isLoading ? (
                <div className="h-64 bg-secondary/30 rounded animate-pulse" />
              ) : attendanceChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No attendance data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={attendanceChartData}>
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                    <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                    <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#attendanceGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Subscriptions", value: subs?.total ?? 0 },
              { label: "Active", value: subs?.active ?? 0, color: "text-green-400" },
              { label: "Expired", value: subs?.expired ?? 0, color: "text-red-400" },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${stat.color ?? "text-primary"}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Subscription Distribution</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              {subscriptionsQuery.isLoading ? (
                <div className="h-64 w-full bg-secondary/30 rounded animate-pulse" />
              ) : subscriptionPieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No subscription data</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={subscriptionPieData} cx="50%" cy="50%" outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {subscriptionPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="supplements">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{supps?.orders ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Orders</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{supps?.supplements?.data?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Active Products</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Product Stock Levels</CardTitle></CardHeader>
            <CardContent>
              {supplementsQuery.isLoading ? (
                <div className="h-48 bg-secondary/30 rounded animate-pulse" />
              ) : (supps?.supplements?.data?.length ?? 0) === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">No products yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={(supps?.supplements?.data ?? []).slice(0, 10).map((s) => ({ name: s.name.slice(0, 12), stock: s.stock }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                    <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                    <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
