import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Edit, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminTrainers() {
  const { t } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [editTrainer, setEditTrainer] = useState<any>(null);
  const trainersQuery = trpc.trainers.list.useQuery({});
  const utils = trpc.useUtils();

  const createMutation = trpc.trainers.create.useMutation({
    onSuccess: () => { utils.trainers.list.invalidate(); setShowAdd(false); toast.success("Trainer added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.trainers.update.useMutation({
    onSuccess: () => { utils.trainers.list.invalidate(); setEditTrainer(null); toast.success("Trainer updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.trainers.delete.useMutation({
    onSuccess: () => { utils.trainers.list.invalidate(); toast.success("Trainer deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      name: fd.get("name") as string,
      phone: fd.get("phone") as string || undefined,
      email: fd.get("email") as string || undefined,
      specialty: fd.get("specialty") as string || undefined,
      salary: fd.get("salary") as string || undefined,
      performanceNotes: fd.get("performanceNotes") as string || undefined,
    };
    if (editTrainer) updateMutation.mutate({ id: editTrainer.id, ...data });
    else createMutation.mutate(data);
  };

  const trainers = trainersQuery.data ?? [];

  return (
    <AdminLayout title={t.trainers.title}>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" />Add Trainer</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainersQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />)
        ) : trainers.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">No trainers yet. Add your first trainer.</div>
        ) : (
          trainers.map((trainer) => (
            <Card key={trainer.id} className="bg-card border-border hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                      {trainer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{trainer.name}</div>
                      <div className="text-xs text-muted-foreground">{trainer.specialty ?? "General Trainer"}</div>
                    </div>
                  </div>
                  <Badge className={trainer.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                    {trainer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm mb-4">
                  {trainer.phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{trainer.phone}</span></div>}
                  {trainer.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground text-xs">{trainer.email}</span></div>}
                  {trainer.salary && <div className="flex justify-between"><span className="text-muted-foreground">Salary</span><span className="text-primary font-medium">${trainer.salary}</span></div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setEditTrainer(trainer)}>
                    <Edit className="w-3 h-3" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: trainer.id, isActive: !trainer.isActive })}>
                    {trainer.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Delete this trainer?")) deleteMutation.mutate({ id: trainer.id }); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showAdd || !!editTrainer} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditTrainer(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editTrainer ? t.trainers.editTrainer : t.trainers.addTrainer}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5"><Label>Full Name *</Label><Input name="name" required defaultValue={editTrainer?.name} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" defaultValue={editTrainer?.phone} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" defaultValue={editTrainer?.email} /></div>
              <div className="space-y-1.5"><Label>Specialty</Label><Input name="specialty" defaultValue={editTrainer?.specialty} placeholder="e.g. Strength & Conditioning" /></div>
              <div className="space-y-1.5"><Label>Monthly Salary ($)</Label><Input name="salary" defaultValue={editTrainer?.salary} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Performance Notes</Label><Input name="performanceNotes" defaultValue={editTrainer?.performanceNotes} /></div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditTrainer(null); }}>Cancel</Button>
              <Button type="submit" className="flex-1">{editTrainer ? "Update" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
