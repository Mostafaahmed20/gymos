import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Edit, Eye, Plus, Search, Trash2, UserX, UserCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const GOALS = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "fitness", label: "General Fitness" },
  { value: "rehab", label: "Rehabilitation" },
  { value: "other", label: "Other" },
];

export default function AdminTrainees() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editTrainee, setEditTrainee] = useState<any>(null);
  const limit = 20;

  const trainersQuery = trpc.trainers.list.useQuery({ isActive: true });
  const traineesQuery = trpc.trainees.list.useQuery({
    search: search || undefined,
    goal: filterGoal !== "all" ? filterGoal : undefined,
    isActive: filterActive === "all" ? undefined : filterActive === "active",
    limit,
    offset: page * limit,
  });

  const utils = trpc.useUtils();
  const createMutation = trpc.trainees.create.useMutation({
    onSuccess: () => { utils.trainees.list.invalidate(); setShowAdd(false); toast.success("Trainee added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.trainees.update.useMutation({
    onSuccess: () => { utils.trainees.list.invalidate(); setEditTrainee(null); toast.success("Trainee updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.trainees.delete.useMutation({
    onSuccess: () => { utils.trainees.list.invalidate(); toast.success("Trainee deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const trainees = traineesQuery.data?.data ?? [];
  const total = traineesQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      fullName: fd.get("fullName") as string,
      phone: fd.get("phone") as string || undefined,
      email: fd.get("email") as string || undefined,
      age: fd.get("age") ? Number(fd.get("age")) : undefined,
      gender: fd.get("gender") as any || undefined,
      goal: fd.get("goal") as any || undefined,
      trainerId: fd.get("trainerId") && fd.get("trainerId") !== "none" ? Number(fd.get("trainerId")) : undefined,
      height: fd.get("height") as string || undefined,
      weight: fd.get("weight") as string || undefined,
      notes: fd.get("notes") as string || undefined,
    };
    if (editTrainee) {
      updateMutation.mutate({ id: editTrainee.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const goalLabel = (goal: string | null) => GOALS.find((g) => g.value === goal)?.label ?? goal ?? "--";

  return (
    <AdminLayout title={t.trainees.title}>
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t.trainees.searchPlaceholder} className="pl-9 w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={filterGoal} onValueChange={(v) => { setFilterGoal(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder={t.trainees.allGoals} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              {GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Trainee
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Phone</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Goal</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden lg:table-cell">Joined</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {traineesQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : trainees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">No trainees found</td>
                  </tr>
                ) : (
                  trainees.map((t) => (
                    <tr key={t.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                            {t.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{t.fullName}</div>
                            <div className="text-xs text-muted-foreground hidden sm:block">{t.email ?? "--"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{t.phone ?? "--"}</td>
                      <td className="p-4 hidden md:table-cell">
                        {t.goal ? <Badge variant="secondary" className="text-xs">{goalLabel(t.goal)}</Badge> : "--"}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {new Date(t.joinDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Badge className={t.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Button asChild variant="ghost" size="icon" className="w-8 h-8">
                            <Link href={`/admin/trainees/${t.id}`}><Eye className="w-4 h-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEditTrainee(t)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => updateMutation.mutate({ id: t.id, isActive: !t.isActive })}>
                            {t.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("Delete this trainee?")) deleteMutation.mutate({ id: t.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editTrainee} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditTrainee(null); } }}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTrainee ? t.trainees.editTrainee : t.trainees.addTrainee}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" defaultValue={editTrainee?.fullName} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">Email (for campaigns)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editTrainee?.email}
                  placeholder="member@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editTrainee?.phone} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" defaultValue={editTrainee?.age} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select name="gender" defaultValue={editTrainee?.gender ?? "unset"}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" name="height" defaultValue={editTrainee?.height} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" name="weight" defaultValue={editTrainee?.weight} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Goal</Label>
                <Select name="goal" defaultValue={editTrainee?.goal ?? "unset"}>
                  <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not specified</SelectItem>
                    {GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Assigned Trainer</Label>
                <Select name="trainerId" defaultValue={editTrainee?.trainerId?.toString() ?? "none"}>
                  <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No trainer</SelectItem>
                    {(trainersQuery.data ?? []).map((tr) => (
                      <SelectItem key={tr.id} value={tr.id.toString()}>{tr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={editTrainee?.notes} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditTrainee(null); }}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {editTrainee ? t.common.save : t.trainees.addTrainee}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
