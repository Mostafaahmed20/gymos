import UserLayout from "@/components/UserLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function UserProgress() {
  const { t } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const progressQuery = trpc.userPortal.progress.useQuery();
  const utils = trpc.useUtils();

  const addMutation = trpc.userPortal.addProgress.useMutation({
    onSuccess: () => { utils.userPortal.progress.invalidate(); setShowAdd(false); toast.success("Progress logged!"); },
    onError: (e) => toast.error(e.message),
  });

  const records = progressQuery.data ?? [];
  const latest = records[0];

  const chartData = [...records].reverse().map((r) => ({
    date: String(r.recordDate).slice(0, 10),
    weight: r.weight ? Number(r.weight) : null,
    bodyFat: r.bodyFat ? Number(r.bodyFat) : null,
  }));

  return (
    <UserLayout title={t.userProgress.title}>
      {/* Latest Stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: t.userProgress.weight, value: latest.weight ? `${latest.weight} ${t.userProfile.kg}` : "--" },
            { label: t.userProgress.bodyFat, value: latest.bodyFat ? `${latest.bodyFat}%` : "--" },
            { label: t.userProgress.chest, value: latest.chest ? `${latest.chest} ${t.userProfile.cm}` : "--" },
            { label: t.userProgress.waist, value: latest.waist ? `${latest.waist} ${t.userProfile.cm}` : "--" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" />{t.userProgress.addRecord}</Button>
      </div>

      {/* Weight Chart */}
      {chartData.length > 1 && (
        <Card className="bg-card border-border mb-6">
          <CardHeader><CardTitle className="text-base">{t.userProgress.weightProgress}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }} />
                <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.17 0.01 260)", border: "1px solid oklch(0.25 0.01 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                <Area type="monotone" dataKey="weight" stroke="#f97316" fill="url(#weightGrad)" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />{t.userProgress.history}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {progressQuery.isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-secondary/30 rounded animate-pulse" />)}</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">{t.userProgress.noProgress}</div>
          ) : (
            <div className="divide-y divide-border">
              {records.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{String(r.recordDate).slice(0, 10)}</span>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                    {r.weight && <div><span className="text-muted-foreground text-xs">{t.userProgress.weight}</span><div className="font-medium text-foreground">{r.weight}kg</div></div>}
                    {r.bodyFat && <div><span className="text-muted-foreground text-xs">{t.userProgress.bodyFat}</span><div className="font-medium text-foreground">{r.bodyFat}%</div></div>}
                    {r.chest && <div><span className="text-muted-foreground text-xs">{t.userProgress.chest}</span><div className="font-medium text-foreground">{r.chest}cm</div></div>}
                    {r.waist && <div><span className="text-muted-foreground text-xs">{t.userProgress.waist}</span><div className="font-medium text-foreground">{r.waist}cm</div></div>}
                    {r.arm && <div><span className="text-muted-foreground text-xs">{t.userProgress.arms}</span><div className="font-medium text-foreground">{r.arm}cm</div></div>}
                    {r.thigh && <div><span className="text-muted-foreground text-xs">{t.userProgress.thighs}</span><div className="font-medium text-foreground">{r.thigh}cm</div></div>}
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground mt-2 italic">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Progress Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{t.userProgress.addRecord}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addMutation.mutate({
              recordDate: fd.get("recordDate") as string,
              weight: fd.get("weight") as string || undefined,
              bodyFat: fd.get("bodyFat") as string || undefined,
              chest: fd.get("chest") as string || undefined,
              waist: fd.get("waist") as string || undefined,
              arm: fd.get("arm") as string || undefined,
              thigh: fd.get("thigh") as string || undefined,
              notes: fd.get("notes") as string || undefined,
            });
          }} className="space-y-4">
            <div className="space-y-1.5"><Label>{t.userProgress.recordDate}</Label><Input name="recordDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{t.userProgress.weight}</Label><Input name="weight" type="number" step="0.1" placeholder="75.5" /></div>
              <div className="space-y-1.5"><Label>{t.userProgress.bodyFat}</Label><Input name="bodyFat" type="number" step="0.1" placeholder="18.5" /></div>
              <div className="space-y-1.5"><Label>{t.userProgress.chest}</Label><Input name="chest" type="number" step="0.1" /></div>
              <div className="space-y-1.5"><Label>{t.userProgress.waist}</Label><Input name="waist" type="number" step="0.1" /></div>
              <div className="space-y-1.5"><Label>{t.userProgress.arms}</Label><Input name="arm" type="number" step="0.1" /></div>
              <div className="space-y-1.5"><Label>{t.userProgress.thighs}</Label><Input name="thigh" type="number" step="0.1" /></div>
            </div>
            <div className="space-y-1.5"><Label>{t.userProgress.notes}</Label><Input name="notes" placeholder="..." /></div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>{t.common.cancel}</Button>
              <Button type="submit" className="flex-1">{t.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
