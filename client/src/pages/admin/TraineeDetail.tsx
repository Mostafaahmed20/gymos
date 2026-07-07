import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function AdminTraineeDetail() {
  const { id } = useParams<{ id: string }>();
  const traineeId = Number(id);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [showAddNutritionAssignment, setShowAddNutritionAssignment] = useState(false);
  const [showSetCredentials, setShowSetCredentials] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedNutritionPlanId, setSelectedNutritionPlanId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "wallet" | "transfer">("cash");
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "late" | "absent">("present");
  const [nutritionStatus, setNutritionStatus] = useState<"active" | "paused" | "completed">("active");
  const [credentialsEmail, setCredentialsEmail] = useState("");
  const [credentialsPassword, setCredentialsPassword] = useState("");
  const [credentialsRole, setCredentialsRole] = useState<"user" | "admin">("user");

  const traineeQuery = trpc.trainees.get.useQuery({ id: traineeId });
  const subscriptionsQuery = trpc.subscriptions.getByTrainee.useQuery({ traineeId });
  const paymentsQuery = trpc.payments.list.useQuery({ traineeId });
  const progressQuery = trpc.progress.list.useQuery({ traineeId });
  const attendanceQuery = trpc.attendance.list.useQuery({ traineeId, limit: 30 });
  const plansQuery = trpc.subscriptions.plans.useQuery();
  const workoutPlansQuery = trpc.workouts.list.useQuery({ isArchived: false });
  const nutritionPlansQuery = trpc.nutrition.listPlans.useQuery({ limit: 500, offset: 0 });
  const nutritionAssignmentsQuery = trpc.nutrition.listAssignments.useQuery({ traineeId, limit: 200, offset: 0 });
  const utils = trpc.useUtils();

  const createSubscriptionMutation = trpc.subscriptions.create.useMutation({
    onSuccess: () => { utils.subscriptions.getByTrainee.invalidate(); setShowAddSubscription(false); toast.success("Subscription created"); },
    onError: (e) => toast.error(e.message),
  });
  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: () => { utils.payments.list.invalidate(); setShowAddPayment(false); toast.success("Payment recorded"); },
    onError: (e) => toast.error(e.message),
  });
  const createProgressMutation = trpc.progress.create.useMutation({
    onSuccess: () => { utils.progress.list.invalidate(); setShowAddProgress(false); toast.success("Progress recorded"); },
    onError: (e) => toast.error(e.message),
  });
  const recordAttendanceMutation = trpc.attendance.record.useMutation({
    onSuccess: () => { utils.attendance.list.invalidate(); setShowAddAttendance(false); toast.success("Attendance recorded"); },
    onError: (e) => toast.error(e.message),
  });
  const assignWorkoutMutation = trpc.workouts.assign.useMutation({
    onSuccess: () => { toast.success("Workout plan assigned"); },
    onError: (e) => toast.error(e.message),
  });
  const setCredentialsMutation = trpc.trainees.setCredentials.useMutation({
    onSuccess: async () => {
      await traineeQuery.refetch();
      setShowSetCredentials(false);
      setCredentialsPassword("");
      toast.success("Login credentials saved");
    },
    onError: (e) => toast.error(e.message),
  });
  const assignNutritionMutation = trpc.nutrition.assignPlan.useMutation({
    onSuccess: async () => {
      await nutritionAssignmentsQuery.refetch();
      setShowAddNutritionAssignment(false);
      setSelectedNutritionPlanId("");
      setNutritionStatus("active");
      toast.success("Nutrition plan assigned");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateNutritionAssignmentMutation = trpc.nutrition.updateAssignment.useMutation({
    onSuccess: async () => {
      await nutritionAssignmentsQuery.refetch();
      toast.success("Nutrition assignment updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const trainee = traineeQuery.data;
  if (traineeQuery.isLoading) return <AdminLayout title="Loading..."><div className="animate-pulse h-64 bg-card rounded-xl" /></AdminLayout>;
  if (!trainee) return <AdminLayout title="Not Found"><p className="text-muted-foreground">Trainee not found</p></AdminLayout>;

  const activeSubscription = subscriptionsQuery.data?.data?.find((s) => s.status === "active");
  const daysRemaining = activeSubscription
    ? Math.max(0, Math.ceil((new Date(activeSubscription.endDate).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <AdminLayout title={trainee.fullName}>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-2 mb-4">
          <Link href="/admin/trainees"><ArrowLeft className="w-4 h-4" /> Back to Trainees</Link>
        </Button>

        {/* Header Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary font-black text-2xl flex-shrink-0">
                {trainee.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-foreground">{trainee.fullName}</h2>
                  <Badge className={trainee.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                    {trainee.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {activeSubscription && (
                    <Badge className="bg-blue-500/20 text-blue-400">{daysRemaining} days left</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Phone: </span><span className="text-foreground">{trainee.phone ?? "--"}</span></div>
                  <div><span className="text-muted-foreground">Email: </span><span className="text-foreground">{trainee.email ?? "--"}</span></div>
                  <div><span className="text-muted-foreground">Age: </span><span className="text-foreground">{trainee.age ?? "--"}</span></div>
                  <div><span className="text-muted-foreground">Goal: </span><span className="text-foreground">{trainee.goal?.replace("_", " ") ?? "--"}</span></div>
                  <div><span className="text-muted-foreground">Height: </span><span className="text-foreground">{trainee.height ? `${trainee.height} cm` : "--"}</span></div>
                  <div><span className="text-muted-foreground">Weight: </span><span className="text-foreground">{trainee.weight ? `${trainee.weight} kg` : "--"}</span></div>
                  <div><span className="text-muted-foreground">Joined: </span><span className="text-foreground">{new Date(trainee.joinDate).toLocaleDateString()}</span></div>
                  <div><span className="text-muted-foreground">Gender: </span><span className="text-foreground">{trainee.gender ?? "--"}</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscription">
        <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="workout">Workout</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Subscriptions</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCredentialsEmail(trainee.email ?? "");
                  setCredentialsRole("user");
                  setCredentialsPassword("");
                  setShowSetCredentials(true);
                }}
              >
                Set Login
              </Button>
              <Button size="sm" onClick={() => setShowAddSubscription(true)} className="gap-2"><Plus className="w-4 h-4" />New Subscription</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Linked user ID: {trainee.userId ?? "--"} | Login email: {trainee.email ?? "--"}
          </p>
          <div className="space-y-3">
            {(subscriptionsQuery.data?.data ?? []).map((sub) => (
              <Card key={sub.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{sub.planName ?? "Custom Plan"}</div>
                      <div className="text-sm text-muted-foreground">{String(sub.startDate)}{" -> "}{String(sub.endDate)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">${sub.price}</span>
                      <Badge className={
                        sub.status === "active" ? "bg-green-500/20 text-green-400" :
                        sub.status === "expired" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }>{sub.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(subscriptionsQuery.data?.data ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">No subscriptions yet</p>
            )}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Payment History</h3>
            <Button size="sm" onClick={() => setShowAddPayment(true)} className="gap-2"><Plus className="w-4 h-4" />Record Payment</Button>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-muted-foreground">Method</th>
                  <th className="text-left p-3 text-muted-foreground">Type</th>
                </tr></thead>
                <tbody>
                  {(paymentsQuery.data?.data ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="p-3 text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="p-3 font-medium text-primary">${p.finalAmount}</td>
                      <td className="p-3 text-muted-foreground capitalize">{p.paymentMethod}</td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs capitalize">{p.type}</Badge></td>
                    </tr>
                  ))}
                  {(paymentsQuery.data?.data ?? []).length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No payments yet</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workout Tab */}
        <TabsContent value="workout">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Workout Plan</h3>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label>Assign Workout Plan</Label>
                <div className="flex gap-3">
                  <Select onValueChange={(v) => assignWorkoutMutation.mutate({ traineeId, planId: Number(v) })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                    <SelectContent>
                      {(workoutPlansQuery.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="nutrition">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Nutrition Assignments</h3>
            <Button size="sm" onClick={() => setShowAddNutritionAssignment(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Assign Nutrition Plan
            </Button>
          </div>

          <div className="space-y-3">
            {(nutritionAssignmentsQuery.data?.data ?? []).map((assignment) => (
              <Card key={assignment.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-medium text-foreground">{assignment.planName ?? `Plan #${assignment.planId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(assignment.startDate).toLocaleDateString()}{" -> "}{new Date(assignment.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          assignment.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : assignment.status === "paused"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-blue-500/20 text-blue-400"
                        }
                      >
                        {assignment.status}
                      </Badge>
                      <Select
                        value={assignment.status}
                        onValueChange={(value) =>
                          updateNutritionAssignmentMutation.mutate({
                            id: assignment.id,
                            status: value as "active" | "paused" | "completed",
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {assignment.notes ? (
                    <p className="text-xs text-muted-foreground">{assignment.notes}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            {(nutritionAssignmentsQuery.data?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No nutrition assignments yet</p>
            ) : null}
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Body Progress</h3>
            <Button size="sm" onClick={() => setShowAddProgress(true)} className="gap-2"><Plus className="w-4 h-4" />Add Record</Button>
          </div>
          <div className="space-y-3">
            {(progressQuery.data ?? []).map((p) => (
              <Card key={p.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{String(p.recordDate)}</span>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                    {p.weight && <div><span className="text-muted-foreground">Weight: </span><span className="text-foreground">{p.weight}kg</span></div>}
                    {p.bodyFat && <div><span className="text-muted-foreground">Body Fat: </span><span className="text-foreground">{p.bodyFat}%</span></div>}
                    {p.chest && <div><span className="text-muted-foreground">Chest: </span><span className="text-foreground">{p.chest}cm</span></div>}
                    {p.waist && <div><span className="text-muted-foreground">Waist: </span><span className="text-foreground">{p.waist}cm</span></div>}
                    {p.arm && <div><span className="text-muted-foreground">Arm: </span><span className="text-foreground">{p.arm}cm</span></div>}
                    {p.thigh && <div><span className="text-muted-foreground">Thigh: </span><span className="text-foreground">{p.thigh}cm</span></div>}
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground mt-2">{p.notes}</p>}
                </CardContent>
              </Card>
            ))}
            {(progressQuery.data ?? []).length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No progress records yet</p>}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Attendance History</h3>
            <Button size="sm" onClick={() => setShowAddAttendance(true)} className="gap-2"><Plus className="w-4 h-4" />Record</Button>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-muted-foreground">Time</th>
                  <th className="text-left p-3 text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {(attendanceQuery.data?.data ?? []).map((a) => (
                    <tr key={a.id} className="border-b border-border">
                      <td className="p-3 text-muted-foreground">{String(a.checkInDate)}</td>
                      <td className="p-3 text-muted-foreground">{new Date(a.checkInTime as any).toLocaleTimeString()}</td>
                      <td className="p-3">
                        <Badge className={a.status === "present" ? "bg-green-500/20 text-green-400" : a.status === "late" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(attendanceQuery.data?.data ?? []).length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No attendance records</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Subscription Dialog */}
      <Dialog open={showAddSubscription} onOpenChange={setShowAddSubscription}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const planId = selectedPlanId ? Number(selectedPlanId) : undefined; const plan = plansQuery.data?.find(p => p.id === planId); createSubscriptionMutation.mutate({ traineeId, planId, planName: plan?.name, price: fd.get("price") as string, startDate: fd.get("startDate") as string, endDate: fd.get("endDate") as string, notes: fd.get("notes") as string || undefined }); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{(plansQuery.data ?? []).map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} - ${p.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Price *</Label><Input name="price" required placeholder="49.99" /></div>
              <div className="space-y-1.5"><Label>Start Date *</Label><Input name="startDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
              <div className="space-y-1.5"><Label>End Date *</Label><Input name="endDate" type="date" required /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input name="notes" /></div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddSubscription(false)}>Cancel</Button><Button type="submit" className="flex-1">Create</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set Credentials Dialog */}
      <Dialog open={showAddNutritionAssignment} onOpenChange={setShowAddNutritionAssignment}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Assign Nutrition Plan</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedNutritionPlanId) {
                toast.error("Select a nutrition plan");
                return;
              }
              const fd = new FormData(e.currentTarget);
              assignNutritionMutation.mutate({
                traineeId,
                planId: Number(selectedNutritionPlanId),
                startDate: String(fd.get("startDate")),
                endDate: String(fd.get("endDate")),
                status: nutritionStatus,
                notes: (fd.get("notes") as string) || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={selectedNutritionPlanId} onValueChange={setSelectedNutritionPlanId}>
                <SelectTrigger><SelectValue placeholder="Select nutrition plan" /></SelectTrigger>
                <SelectContent>
                  {(nutritionPlansQuery.data?.data ?? []).map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name} - {plan.totalCalories} kcal
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input name="startDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input name="endDate" type="date" required defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={nutritionStatus} onValueChange={(value) => setNutritionStatus(value as "active" | "paused" | "completed")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input name="notes" placeholder="Optional notes" />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddNutritionAssignment(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={assignNutritionMutation.isPending}>
                {assignNutritionMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set Credentials Dialog */}
      <Dialog open={showSetCredentials} onOpenChange={setShowSetCredentials}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Set Member Login Credentials</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCredentialsMutation.mutate({
                traineeId,
                email: credentialsEmail.trim(),
                password: credentialsPassword,
                role: credentialsRole,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                required
                value={credentialsEmail}
                onChange={(e) => setCredentialsEmail(e.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={credentialsPassword}
                onChange={(e) => setCredentialsPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={credentialsRole}
                onChange={(e) => setCredentialsRole(e.target.value as "user" | "admin")}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              Share these credentials with the trainee. Their account is linked automatically.
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSetCredentials(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={setCredentialsMutation.isPending}>
                {setCredentialsMutation.isPending ? "Saving..." : "Save Credentials"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const amount = fd.get("amount") as string; const discount = fd.get("discount") as string || "0"; createPaymentMutation.mutate({ traineeId, amount, discount, finalAmount: String(Number(amount) - Number(discount)), paymentMethod, receiptNumber: fd.get("receiptNumber") as string || undefined, notes: fd.get("notes") as string || undefined }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Amount *</Label><Input name="amount" required placeholder="49.99" /></div>
              <div className="space-y-1.5"><Label>Discount</Label><Input name="discount" placeholder="0" /></div>
              <div className="col-span-2 space-y-1.5"><Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="wallet">Wallet</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Receipt #</Label><Input name="receiptNumber" /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Input name="notes" /></div>
            </div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddPayment(false)}>Cancel</Button><Button type="submit" className="flex-1">Record</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Progress Dialog */}
      <Dialog open={showAddProgress} onOpenChange={setShowAddProgress}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Add Progress Record</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createProgressMutation.mutate({ traineeId, recordDate: fd.get("recordDate") as string, weight: fd.get("weight") as string || undefined, bodyFat: fd.get("bodyFat") as string || undefined, chest: fd.get("chest") as string || undefined, waist: fd.get("waist") as string || undefined, arm: fd.get("arm") as string || undefined, thigh: fd.get("thigh") as string || undefined, notes: fd.get("notes") as string || undefined }); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Date *</Label><Input name="recordDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Weight (kg)</Label><Input name="weight" /></div>
              <div className="space-y-1.5"><Label>Body Fat (%)</Label><Input name="bodyFat" /></div>
              <div className="space-y-1.5"><Label>Chest (cm)</Label><Input name="chest" /></div>
              <div className="space-y-1.5"><Label>Waist (cm)</Label><Input name="waist" /></div>
              <div className="space-y-1.5"><Label>Arm (cm)</Label><Input name="arm" /></div>
              <div className="space-y-1.5"><Label>Thigh (cm)</Label><Input name="thigh" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input name="notes" /></div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddProgress(false)}>Cancel</Button><Button type="submit" className="flex-1">Save</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Attendance Dialog */}
      <Dialog open={showAddAttendance} onOpenChange={setShowAddAttendance}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); recordAttendanceMutation.mutate({ traineeId, checkInDate: fd.get("checkInDate") as string, status: attendanceStatus, notes: fd.get("notes") as string || undefined }); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Date *</Label><Input name="checkInDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={attendanceStatus} onValueChange={(value) => setAttendanceStatus(value as typeof attendanceStatus)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="present">Present</SelectItem><SelectItem value="late">Late</SelectItem><SelectItem value="absent">Absent</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input name="notes" /></div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddAttendance(false)}>Cancel</Button><Button type="submit" className="flex-1">Record</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
