import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Activity, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500/20 text-green-400",
  late: "bg-yellow-500/20 text-yellow-400",
  absent: "bg-red-500/20 text-red-400",
};

export default function AdminAttendance() {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const [showRecord, setShowRecord] = useState(false);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>("");
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "late" | "absent">("present");
  const limit = 30;

  const attendanceQuery = trpc.attendance.list.useQuery({ limit, offset: page * limit });
  const todayCountQuery = trpc.attendance.todayCount.useQuery();
  const traineesQuery = trpc.trainees.list.useQuery({ isActive: true, limit: 200 });
  const utils = trpc.useUtils();

  const recordMutation = trpc.attendance.record.useMutation({
    onSuccess: () => { utils.attendance.list.invalidate(); utils.attendance.todayCount.invalidate(); setShowRecord(false); toast.success("Attendance recorded"); },
    onError: (e) => toast.error(e.message),
  });

  const records = attendanceQuery.data?.data ?? [];
  const total = attendanceQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout title={t.attendance.title}>
      {/* Today Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border md:col-span-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-3xl font-black text-primary">{todayCountQuery.data ?? 0}</div>
              <div className="text-sm text-muted-foreground">Today's Check-ins</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Records</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {records.filter(r => r.status === "present").length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Present (Recent)</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => {
          setSelectedTraineeId("");
          setAttendanceStatus("present");
          setShowRecord(true);
        }} className="gap-2"><Plus className="w-4 h-4" />Record Attendance</Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Attendance Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Trainee</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Time</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendanceQuery.isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No attendance records</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-4 font-medium text-foreground">{(r as any).traineeName ?? `Trainee #${r.traineeId}`}</td>
                      <td className="p-4 text-muted-foreground">{String(r.checkInDate)}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{new Date(r.checkInTime as any).toLocaleTimeString()}</td>
                      <td className="p-4">
                        <Badge className={STATUS_COLORS[r.status] ?? "bg-gray-500/20 text-gray-400"}>{r.status}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">{r.notes ?? "--"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Attendance Dialog */}
      <Dialog
        open={showRecord}
        onOpenChange={(open) => {
          setShowRecord(open);
          if (!open) {
            setSelectedTraineeId("");
            setAttendanceStatus("present");
          }
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            recordMutation.mutate({
              traineeId: Number(selectedTraineeId),
              checkInDate: fd.get("checkInDate") as string,
              status: attendanceStatus,
              notes: fd.get("notes") as string || undefined,
            });
          }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Trainee *</Label>
              <Select value={selectedTraineeId} onValueChange={setSelectedTraineeId}>
                <SelectTrigger><SelectValue placeholder="Select trainee" /></SelectTrigger>
                <SelectContent>
                  {(traineesQuery.data?.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Date *</Label><Input name="checkInDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={attendanceStatus} onValueChange={(value) => setAttendanceStatus(value as typeof attendanceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input name="notes" /></div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowRecord(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={!selectedTraineeId}>Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
