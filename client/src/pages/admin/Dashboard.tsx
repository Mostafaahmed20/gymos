import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CreditCard,
  Dumbbell,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
  UserCheck,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308"];

export default function AdminDashboard() {
  const { t } = useLanguage();
  const statsQuery = trpc.dashboard.stats.useQuery();
  const revenueQuery = trpc.dashboard.monthlyRevenue.useQuery({ months: 6 });
  const stats = statsQuery.data;
  const revenue = revenueQuery.data ?? [];

  const statCards = stats
    ? [
        { label: t.dashboard.totalTrainees, value: stats.totalTrainees, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
        { label: t.dashboard.activeSubscriptions, value: stats.activeSubscriptions, icon: Calendar, color: "text-green-400", bg: "bg-green-400/10" },
        { label: t.dashboard.expiredSubscriptions, value: stats.expiredSubscriptions, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
        { label: t.dashboard.expiringSoon, value: stats.expiringSoon, icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
        { label: t.dashboard.totalRevenue, value: `$${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
        { label: t.dashboard.monthlyRevenue, value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
        { label: t.dashboard.todayAttendance, value: stats.todayAttendance, icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10" },
        { label: t.dashboard.totalOrders, value: stats.totalOrders, icon: ShoppingBag, color: "text-purple-400", bg: "bg-purple-400/10" },
        { label: t.dashboard.lowStockItems, value: stats.lowStockSupplements, icon: Package, color: "text-orange-400", bg: "bg-orange-400/10" },
        { label: t.dashboard.newThisMonth, value: stats.newTraineesThisMonth, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
      ]
    : [];

  const quickActions = [
    { label: t.dashboard.addTrainee, href: "/admin/trainees", icon: Users },
    { label: t.dashboard.addTrainer, href: "/admin/trainers", icon: UserCheck },
    { label: t.dashboard.newSubscription, href: "/admin/subscriptions", icon: Calendar },
    { label: t.dashboard.recordPayment, href: "/admin/payments", icon: CreditCard },
    { label: t.dashboard.sendOffer, href: "/admin/marketing", icon: BarChart3 },
    { label: t.dashboard.addSupplement, href: "/admin/supplements", icon: ShoppingBag },
    { label: t.dashboard.createWorkout, href: "/admin/workouts", icon: Dumbbell },
  ];

  const subscriptionData = stats
    ? [
        { name: t.dashboard.active, value: stats.activeSubscriptions },
        { name: t.dashboard.expired, value: stats.expiredSubscriptions },
      ]
    : [];

  return (
    <AdminLayout title={t.dashboard.title}>
      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t.dashboard.quickActions}</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.label} asChild variant="outline" size="sm" className="gap-2">
                <Link href={action.href}>
                  <Plus className="w-3 h-3" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{card.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">{t.dashboard.monthlyRevenueChart}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueQuery.isLoading ? (
              <div className="h-48 bg-secondary/30 rounded animate-pulse" />
            ) : revenue.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t.dashboard.noRevenueData}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                  <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscription Pie */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">{t.dashboard.subscriptionsChart}</CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="h-48 bg-secondary/30 rounded animate-pulse" />
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={subscriptionData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {subscriptionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {subscriptionData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
