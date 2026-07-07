import UserLayout from "@/components/UserLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity } from "lucide-react";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500/20 text-green-400",
  late: "bg-yellow-500/20 text-yellow-400",
  absent: "bg-red-500/20 text-red-400",
};

export default function UserAttendance() {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const limit = 20;
  const attendanceQuery = trpc.userPortal.attendance.useQuery({ limit, offset: page * limit });

  const records = attendanceQuery.data?.data ?? [];
  const total = attendanceQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  const statusLabel = (status: string) => {
    if (status === "present") return t.userAttendance.checkIn;
    if (status === "late") return t.common.warning;
    if (status === "absent") return t.common.inactive;
    return status;
  };

  return (
    <UserLayout title={t.userAttendance.title}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-primary">{total}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.userAttendance.totalVisits}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-green-400">{presentCount}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.userAttendance.thisMonth}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-yellow-400">{lateCount}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.userAttendance.thisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {t.userAttendance.attendanceHistory}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {attendanceQuery.isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">{t.userAttendance.noAttendance}</div>
          ) : (
            <div className="divide-y divide-border">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div>
                    <div className="font-medium text-foreground">{String(r.checkInDate)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.checkInTime as any).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.notes && <span className="text-xs text-muted-foreground hidden sm:block">{r.notes}</span>}
                    <Badge className={STATUS_COLORS[r.status] ?? "bg-gray-500/20 text-gray-400"}>
                      {statusLabel(r.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  {t.common.previous}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  {t.common.next}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </UserLayout>
  );
}
