import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Copy, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type NutritionGoal = "weight_loss" | "muscle_gain" | "maintenance" | "cutting" | "bulking";

const GOAL_OPTIONS: NutritionGoal[] = ["weight_loss", "muscle_gain", "maintenance", "cutting", "bulking"];

const goalColor: Record<NutritionGoal, string> = {
  weight_loss: "bg-blue-500/20 text-blue-400",
  muscle_gain: "bg-green-500/20 text-green-400",
  maintenance: "bg-slate-500/20 text-slate-400",
  cutting: "bg-orange-500/20 text-orange-400",
  bulking: "bg-purple-500/20 text-purple-400",
};

export default function AdminNutrition() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [showAssign, setShowAssign] = useState(false);
  const [assignment, setAssignment] = useState({
    planId: "none",
    traineeId: "none",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  });
  const limit = 20;

  const plansQuery = trpc.nutrition.listPlans.useQuery({
    search: search.trim() || undefined,
    goal: goal !== "all" ? goal as NutritionGoal : undefined,
    limit,
    offset: page * limit,
  });
  const traineesQuery = trpc.trainees.list.useQuery({ isActive: true, limit: 5000, offset: 0 });
  const utils = trpc.useUtils();

  const deleteMutation = trpc.nutrition.deletePlan.useMutation({
    onSuccess: async () => {
      await utils.nutrition.listPlans.invalidate();
      toast.success(t.common.delete);
    },
    onError: (error) => toast.error(error.message),
  });

  const duplicateMutation = trpc.nutrition.duplicatePlan.useMutation({
    onSuccess: async () => {
      await utils.nutrition.listPlans.invalidate();
      toast.success(t.nutrition.duplicate);
    },
    onError: (error) => toast.error(error.message),
  });

  const assignMutation = trpc.nutrition.assignPlan.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.nutrition.listAssignments.invalidate(), utils.nutrition.listPlans.invalidate()]);
      setShowAssign(false);
      setAssignment({
        planId: "none",
        traineeId: "none",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        notes: "",
      });
      toast.success(t.nutrition.assigned);
    },
    onError: (error) => toast.error(error.message),
  });

  const plans = plansQuery.data?.data ?? [];
  const stats = plansQuery.data?.stats ?? { totalPlans: 0, activeAssignments: 0, avgCalories: 0 };
  const total = plansQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const trainees = traineesQuery.data?.data ?? [];

  const goalLabel = (value: NutritionGoal) => {
    switch (value) {
      case "weight_loss":
        return t.nutrition.weightLoss;
      case "muscle_gain":
        return t.nutrition.muscleGain;
      case "maintenance":
        return t.nutrition.maintenance;
      case "cutting":
        return t.nutrition.cutting;
      case "bulking":
        return t.nutrition.bulking;
      default:
        return value;
    }
  };

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === assignment.planId),
    [plans, assignment.planId]
  );

  return (
    <AdminLayout title={t.nutrition.title}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t.nutrition.totalPlans}</div>
            <div className="text-2xl font-black text-foreground mt-1">{stats.totalPlans}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t.nutrition.activeAssignments}</div>
            <div className="text-2xl font-black text-primary mt-1">{stats.activeAssignments}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t.nutrition.avgCalories}</div>
            <div className="text-2xl font-black text-red-400 mt-1">{stats.avgCalories}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            className="w-60 pl-9"
            placeholder={t.nutrition.searchPlans}
          />
        </div>
        <Select value={goal} onValueChange={(value) => { setGoal(value); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder={t.nutrition.allGoals} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.nutrition.allGoals}</SelectItem>
            {GOAL_OPTIONS.map((goalOption) => (
              <SelectItem key={goalOption} value={goalOption}>{goalLabel(goalOption)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAssign(true)} variant="outline" className="gap-2 ms-auto">
          <UserPlus className="w-4 h-4" />
          {t.nutrition.assignPlan}
        </Button>
        <Button asChild className="gap-2">
          <Link href="/admin/nutrition/new">
            <Plus className="w-4 h-4" />
            {t.nutrition.createPlan}
          </Link>
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start p-4 text-muted-foreground font-medium">{t.nutrition.planName}</th>
                <th className="text-start p-4 text-muted-foreground font-medium">{t.nutrition.goal}</th>
                <th className="text-start p-4 text-muted-foreground font-medium">{t.nutrition.calories}</th>
                <th className="text-start p-4 text-muted-foreground font-medium hidden md:table-cell">{t.nutrition.protein}</th>
                <th className="text-start p-4 text-muted-foreground font-medium hidden md:table-cell">{t.nutrition.carbs}</th>
                <th className="text-start p-4 text-muted-foreground font-medium hidden md:table-cell">{t.nutrition.fat}</th>
                <th className="text-start p-4 text-muted-foreground font-medium">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {plansQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-border">
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className="p-4"><div className="h-4 bg-secondary/40 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">{t.nutrition.noPlans}</td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border hover:bg-secondary/20">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{plan.name}</div>
                      {plan.isTemplate ? <Badge variant="secondary" className="text-xs mt-1">{t.nutrition.template}</Badge> : null}
                    </td>
                    <td className="p-4">
                      <Badge className={goalColor[plan.goal as NutritionGoal] ?? "bg-slate-500/20 text-slate-400"}>
                        {goalLabel(plan.goal as NutritionGoal)}
                      </Badge>
                    </td>
                    <td className="p-4 text-red-400 font-semibold">{plan.totalCalories}</td>
                    <td className="p-4 hidden md:table-cell text-blue-400">{plan.totalProtein}</td>
                    <td className="p-4 hidden md:table-cell text-orange-400">{plan.totalCarbs}</td>
                    <td className="p-4 hidden md:table-cell text-yellow-400">{plan.totalFat}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/nutrition/${plan.id}/edit`}>{t.common.edit}</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate({ id: plan.id })}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (!confirm(t.nutrition.confirmDelete)) return;
                            deleteMutation.mutate({ id: plan.id });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
            {t.common.previous}
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((current) => current + 1)}>
            {t.common.next}
          </Button>
        </div>
      ) : null}

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{t.nutrition.assignPlan}</DialogTitle></DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (assignment.planId === "none" || assignment.traineeId === "none") {
                toast.error(t.common.required);
                return;
              }
              assignMutation.mutate({
                planId: Number(assignment.planId),
                traineeId: Number(assignment.traineeId),
                startDate: assignment.startDate,
                endDate: assignment.endDate || assignment.startDate,
                notes: assignment.notes || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>{t.nutrition.selectPlan}</Label>
              <Select value={assignment.planId} onValueChange={(value) => setAssignment((prev) => ({ ...prev, planId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.nutrition.selectPlan}</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.nutrition.selectTrainee}</Label>
              <Select value={assignment.traineeId} onValueChange={(value) => setAssignment((prev) => ({ ...prev, traineeId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.nutrition.selectTrainee}</SelectItem>
                  {trainees.map((trainee) => (
                    <SelectItem key={trainee.id} value={String(trainee.id)}>{trainee.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlan ? (
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium text-foreground">{selectedPlan.name}</div>
                <div className="text-muted-foreground">{selectedPlan.totalCalories} kcal</div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.nutrition.startDate}</Label>
                <Input type="date" value={assignment.startDate} onChange={(event) => setAssignment((prev) => ({ ...prev, startDate: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.nutrition.endDate}</Label>
                <Input type="date" value={assignment.endDate} onChange={(event) => setAssignment((prev) => ({ ...prev, endDate: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.nutrition.notes}</Label>
              <Input value={assignment.notes} onChange={(event) => setAssignment((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAssign(false)}>{t.common.cancel}</Button>
              <Button type="submit" className="flex-1" disabled={assignMutation.isPending}>{assignMutation.isPending ? t.common.loading : t.nutrition.assignPlan}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
