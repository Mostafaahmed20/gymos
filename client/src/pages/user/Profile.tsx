import UserLayout from "@/components/UserLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { User, Phone, Mail, Target, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";

export default function UserProfile() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const profileQuery = trpc.userPortal.profile.useQuery();
  const subscriptionQuery = trpc.userPortal.subscription.useQuery();
  const utils = trpc.useUtils();
  const upsertProfileMutation = trpc.userPortal.upsertProfile.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.userPortal.profile.invalidate(),
        utils.userPortal.subscription.invalidate(),
      ]);
      toast.success("Profile saved successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const profile = profileQuery.data;
  const sub = subscriptionQuery.data;

  const daysLeft = sub?.endDate
    ? Math.max(0, Math.ceil((new Date(sub.endDate as any).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <UserLayout title={t.userProfile.title}>
      <div className="max-w-2xl space-y-6">
        {/* Avatar + Name */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary font-black text-3xl flex-shrink-0">
                {(profile?.fullName ?? user?.name ?? "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">{profile?.fullName ?? user?.name ?? t.common.profile}</h2>
                <p className="text-muted-foreground">{user?.email ?? t.common.noData}</p>
                <div className="flex gap-2 mt-2">
                  {profile?.goal && <Badge variant="secondary" className="capitalize text-xs">{profile.goal.replace("_", " ")}</Badge>}
                  <Badge className="bg-primary/20 text-primary text-xs">{t.nav.userPortal}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t.userProfile.personalInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-secondary/30 rounded animate-pulse" />
                ))}
              </div>
            ) : !profile ? (
              <p className="text-muted-foreground text-sm">{t.userProfile.noTrainer}</p>
            ) : (
              <div className="space-y-3">
                {[
                  { icon: User, label: t.common.name, value: profile.fullName },
                  { icon: Phone, label: t.common.phone, value: profile.phone ?? "--" },
                  { icon: Mail, label: t.common.email, value: profile.email ?? user?.email ?? "--" },
                  { icon: Calendar, label: t.userProfile.age, value: profile.age ? `${profile.age} ${t.userProfile.yrs}` : "--" },
                  { icon: Activity, label: t.userProfile.height, value: profile.height ? `${profile.height} ${t.userProfile.cm}` : "--" },
                  { icon: Activity, label: t.userProfile.weight, value: profile.weight ? `${profile.weight} ${t.userProfile.kg}` : "--" },
                  { icon: Target, label: t.userProfile.goal, value: profile.goal ? profile.goal.replace("_", " ") : "--" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground capitalize">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {t.userDashboard.subscriptionStatus}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!sub ? (
              <p className="text-muted-foreground text-sm">{t.userDashboard.noSubscription}</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.nav.subscriptions}</span>
                  <span className="font-medium text-foreground">{sub.planName ?? t.common.noData}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.common.status}</span>
                  <Badge className={sub.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                    {sub.status === "active" ? t.common.active : t.common.inactive}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.common.date}</span>
                  <span className="text-foreground text-sm">{String(sub.startDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.common.date}</span>
                  <span className="text-foreground text-sm">{String(sub.endDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.userDashboard.daysRemaining}</span>
                  <span className={`font-bold ${daysLeft !== null && daysLeft <= 7 ? "text-red-400" : "text-primary"}`}>
                    {daysLeft !== null ? `${daysLeft} ${t.userDashboard.daysRemaining}` : "--"}
                  </span>
                </div>
                {/* Progress Bar */}
                {sub.startDate && sub.endDate && (
                  <div>
                    <div className="w-full bg-secondary rounded-full h-2 mt-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{
                        width: `${Math.min(100, Math.max(0, Math.round(
                          ((Date.now() - new Date(sub.startDate as any).getTime()) /
                            (new Date(sub.endDate as any).getTime() - new Date(sub.startDate as any).getTime())) * 100
                        )))}%`
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {t.userProfile.bodyStats}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-secondary/30 rounded-xl">
                <div className="text-3xl font-black text-primary">{profile?.attendanceCount ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.userAttendance.totalVisits}</div>
              </div>
              <div className="text-center p-4 bg-secondary/30 rounded-xl">
                <div className="text-3xl font-black text-foreground">{daysLeft ?? "--"}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.userDashboard.daysRemaining}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit / Setup Profile */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {profile ? "Update Profile" : "Complete Your Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                upsertProfileMutation.mutate({
                  fullName: (fd.get("fullName") as string) || user?.name || "Member",
                  age: fd.get("age") ? Number(fd.get("age")) : undefined,
                  phone: (fd.get("phone") as string) || undefined,
                  email: (fd.get("email") as string) || undefined,
                  height: (fd.get("height") as string) || undefined,
                  weight: (fd.get("weight") as string) || undefined,
                  goal: ((fd.get("goal") as string) || undefined) as
                    | "weight_loss"
                    | "muscle_gain"
                    | "fitness"
                    | "rehab"
                    | "other"
                    | undefined,
                });
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input name="fullName" defaultValue={profile?.fullName ?? user?.name ?? ""} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input name="email" type="email" defaultValue={profile?.email ?? user?.email ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={profile?.phone ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <Input name="age" type="number" defaultValue={profile?.age ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Height (cm)</Label>
                  <Input name="height" defaultValue={String(profile?.height ?? "")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Weight (kg)</Label>
                  <Input name="weight" defaultValue={String(profile?.weight ?? "")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Goal</Label>
                <select
                  name="goal"
                  defaultValue={profile?.goal ?? ""}
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Select goal</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="fitness">Fitness</option>
                  <option value="rehab">Rehab</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Button type="submit" disabled={upsertProfileMutation.isPending}>
                {upsertProfileMutation.isPending ? "Saving..." : profile ? "Update Profile" : "Create Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
