import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  expired: "bg-red-500/20 text-red-400",
  frozen: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-gray-500/20 text-gray-400",
  pending: "bg-yellow-500/20 text-yellow-400",
};

export default function AdminSubscriptions() {
  const { t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planType, setPlanType] = useState<
    "monthly" | "quarterly" | "half_year" | "yearly" | "custom"
  >("monthly");
  const [page, setPage] = useState(0);
  const limit = 20;

  const plansQuery = trpc.subscriptions.plans.useQuery();
  const subscriptionsQuery = trpc.subscriptions.list.useQuery({
    status: filterStatus !== "all" ? filterStatus : undefined,
    limit,
    offset: page * limit,
  });
  const utils = trpc.useUtils();

  const createPlanMutation = trpc.subscriptions.createPlan.useMutation({
    onSuccess: () => { utils.subscriptions.plans.invalidate(); setShowAddPlan(false); toast.success("Plan created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.subscriptions.update.useMutation({
    onSuccess: () => { utils.subscriptions.list.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const subscriptions = subscriptionsQuery.data?.data ?? [];
  const total = subscriptionsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout title={t.subscriptions.title}>
      <Tabs defaultValue="subscriptions">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="subscriptions">All Subscriptions</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-muted-foreground font-medium">Trainee</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Plan</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Start</th>
                      <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">End</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Price</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionsQuery.isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="p-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                          ))}
                        </tr>
                      ))
                    ) : subscriptions.length === 0 ? (
                      <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No subscriptions found</td></tr>
                    ) : (
                      subscriptions.map((sub) => {
                        const daysLeft = Math.ceil((new Date(sub.endDate as any).getTime() - Date.now()) / 86400000);
                        return (
                          <tr key={sub.id} className="border-b border-border hover:bg-secondary/30">
                            <td className="p-4 font-medium text-foreground">{(sub as any).traineeName ?? `Trainee #${sub.traineeId}`}</td>
                            <td className="p-4 text-muted-foreground hidden md:table-cell">{sub.planName ?? "Custom"}</td>
                            <td className="p-4 text-muted-foreground hidden sm:table-cell">{String(sub.startDate)}</td>
                            <td className="p-4 hidden sm:table-cell">
                              <div className="text-muted-foreground">{String(sub.endDate)}</div>
                              {sub.status === "active" && (
                                <div className={`text-xs ${daysLeft <= 7 ? "text-red-400" : daysLeft <= 30 ? "text-yellow-400" : "text-green-400"}`}>
                                  {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-medium text-primary">${sub.price}</td>
                            <td className="p-4">
                              <Badge className={STATUS_COLORS[sub.status] ?? "bg-gray-500/20 text-gray-400"}>{sub.status}</Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1 justify-end">
                                {sub.status === "active" && (
                                  <Button variant="ghost" size="sm" className="gap-1 text-xs"
                                    onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "frozen" })}>
                                    <RefreshCw className="w-3 h-3" />Freeze
                                  </Button>
                                )}
                                {sub.status === "frozen" && (
                                  <Button variant="ghost" size="sm" className="gap-1 text-xs"
                                    onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "active" })}>
                                    Unfreeze
                                  </Button>
                                )}
                                {sub.status !== "cancelled" && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs"
                                    onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "cancelled" })}>
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <div className="flex justify-end mb-6">
            <Button onClick={() => setShowAddPlan(true)} className="gap-2"><Plus className="w-4 h-4" />New Plan</Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(plansQuery.data ?? []).map((plan) => (
              <Card key={plan.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge className={plan.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-primary mb-1">${plan.price}</div>
                  <div className="text-sm text-muted-foreground mb-2">{plan.durationDays} days - {plan.type}</div>
                  {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Plan Dialog */}
      <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Create Subscription Plan</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createPlanMutation.mutate({
              name: fd.get("name") as string,
              type: planType,
              durationDays: Number(fd.get("durationDays")),
              price: fd.get("price") as string,
              description: fd.get("description") as string || undefined,
            });
          }} className="space-y-4">
            <div className="space-y-1.5"><Label>Plan Name *</Label><Input name="name" required placeholder="e.g. Monthly Premium" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Type *</Label>
                <Select value={planType} onValueChange={(value) => setPlanType(value as typeof planType)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_year">Half Year</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Duration (days) *</Label><Input name="durationDays" type="number" required placeholder="30" /></div>
              <div className="space-y-1.5"><Label>Price ($) *</Label><Input name="price" required placeholder="49.99" /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input name="description" /></div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddPlan(false)}>Cancel</Button>
              <Button type="submit" className="flex-1">Create Plan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
