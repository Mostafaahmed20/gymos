import UserLayout from "@/components/UserLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Activity, Calendar, Dumbbell, ShoppingBag, TrendingUp, Bell } from "lucide-react";
import { Link } from "wouter";

export default function UserDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const profileQuery = trpc.userPortal.profile.useQuery();
  const subscriptionQuery = trpc.userPortal.subscription.useQuery();
  const workoutQuery = trpc.userPortal.todayWorkout.useQuery();
  const notificationsQuery = trpc.userPortal.notifications.useQuery({ limit: 3 });

  const profile = profileQuery.data;
  const sub = subscriptionQuery.data;
  const todayWorkout = workoutQuery.data;
  const notifications = notificationsQuery.data ?? [];

  const daysLeft = sub?.endDate
    ? Math.max(0, Math.ceil((new Date(sub.endDate as any).getTime() - Date.now()) / 86400000))
    : null;
  const subProgress = sub?.startDate && sub?.endDate
    ? Math.min(100, Math.max(0, Math.round(
        ((Date.now() - new Date(sub.startDate as any).getTime()) /
          (new Date(sub.endDate as any).getTime() - new Date(sub.startDate as any).getTime())) * 100
      )))
    : 0;

  const statusLabel = (status: string) => {
    if (status === "active") return t.userDashboard.active;
    if (status === "frozen") return t.userDashboard.frozen;
    if (status === "cancelled") return t.userDashboard.cancelled;
    if (status === "expired") return t.userDashboard.expired;
    return status;
  };

  return (
    <UserLayout title={t.userDashboard.title}>
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 p-6 mb-6">
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-foreground">
            {t.userDashboard.welcome}, {user?.name?.split(" ")[0] ?? "Athlete"}! 💪
          </h2>
          <p className="text-muted-foreground mt-1">
            {todayWorkout
              ? `${t.userDashboard.todayWorkout}: ${todayWorkout.dayName}`
              : t.userDashboard.noWorkoutToday}
          </p>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
          <Dumbbell className="w-24 h-24 text-primary" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Subscription */}
        <Card className="bg-card border-border col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t.userDashboard.subscriptionStatus}</span>
              </div>
              {sub && (
                <Badge className={
                  sub.status === "active" ? "bg-green-500/20 text-green-400" :
                  sub.status === "expired" ? "bg-red-500/20 text-red-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }>{statusLabel(sub.status)}</Badge>
              )}
            </div>
            {sub ? (
              <>
                <div className="text-sm text-muted-foreground mb-1">{sub.planName ?? t.nav.subscriptions}</div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>{String(sub.startDate)}</span>
                  <span className={daysLeft !== null && daysLeft <= 7 ? "text-red-400 font-medium" : ""}>
                    {daysLeft} {t.userDashboard.daysRemaining}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${subProgress}%` }} />
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{t.userDashboard.noSubscription}</div>
            )}
          </CardContent>
        </Card>

        {/* Today's Workout */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t.userDashboard.todayWorkout}</span>
            </div>
            {todayWorkout ? (
              <>
                <div className="font-semibold text-foreground text-sm">{todayWorkout.dayName}</div>
                <Badge variant="secondary" className="text-xs mt-1 capitalize">{todayWorkout.category}</Badge>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{t.userWorkout.restDay}</div>
            )}
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t.userDashboard.recentAttendance}</span>
            </div>
            <div className="text-2xl font-black text-primary">{profile?.attendanceCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">{t.userAttendance.totalVisits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Notifications */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.userDashboard.quickLinks}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { icon: Dumbbell, label: t.userDashboard.viewWorkout, href: "/workout", color: "text-primary" },
              { icon: TrendingUp, label: t.userDashboard.viewProgress, href: "/progress", color: "text-green-400" },
              { icon: Activity, label: t.nav.myAttendance, href: "/attendance", color: "text-blue-400" },
              { icon: ShoppingBag, label: t.userDashboard.browseStore, href: "/store", color: "text-purple-400" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`w-4 h-4 ${action.color}`} />
                    </div>
                    <span className="text-sm text-foreground">{action.label}</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.userNotifications.title}</CardTitle>
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="text-xs text-primary">{t.userNotifications.all}</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">{t.userNotifications.noNotifications}</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className={`flex gap-3 p-3 rounded-lg ${!n.isRead ? "bg-primary/5 border border-primary/20" : "bg-secondary/30"}`}>
                    <Bell className={`w-4 h-4 flex-shrink-0 mt-0.5 ${!n.isRead ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
