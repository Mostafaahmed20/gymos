import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  subscription_expiring: "text-yellow-400",
  subscription_expired: "text-red-400",
  payment_confirmed: "text-green-400",
  new_workout: "text-blue-400",
  offer: "text-purple-400",
  low_stock: "text-orange-400",
  new_order: "text-cyan-400",
  new_trainee: "text-pink-400",
  attendance_reminder: "text-yellow-300",
  general: "text-primary",
};

function targetPathByType(type?: string) {
  if (type === "new_order" || type === "low_stock") return "/admin/supplements";
  if (type === "payment_confirmed") return "/admin/payments";
  if (type === "new_trainee") return "/admin/trainees";
  if (type === "new_workout") return "/admin/workouts";
  if (type === "subscription_expiring" || type === "subscription_expired") return "/admin/subscriptions";
  if (type === "attendance_reminder") return "/admin/attendance";
  if (type === "offer") return "/admin/marketing";
  return "/admin/notifications";
}

export default function AdminNotifications() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const notificationsQuery = trpc.notifications.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      toast.success(t.userNotifications.markAllRead);
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AdminLayout title={t.userNotifications.title}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t.userNotifications.title}</h2>
          {unreadCount > 0 ? (
            <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount} {t.userNotifications.unread}
            </span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => markAllMutation.mutate()}>
            <CheckCheck className="w-3 h-3" />
            {t.userNotifications.markAllRead}
          </Button>
        ) : null}
      </div>

      {notificationsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">{t.userNotifications.noNotifications}</h3>
          <p className="text-muted-foreground text-sm">{t.common.noData}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`bg-card border-border cursor-pointer transition-all hover:border-primary/30 ${!n.isRead ? "border-primary/20 bg-primary/5" : ""}`}
              onClick={() => {
                if (!n.isRead) {
                  markReadMutation.mutate({ id: n.id });
                }
                setLocation(targetPathByType(n.type));
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`font-semibold text-sm ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </h4>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(n.createdAt as any).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    {n.type ? (
                      <span className={`text-xs font-medium mt-1.5 block capitalize ${TYPE_COLORS[n.type] ?? "text-primary"}`}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
