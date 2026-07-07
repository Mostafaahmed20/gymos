import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dumbbell, User, Shield, Bell, Database, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [testEmail, setTestEmail] = useState(user?.email ?? "");

  const sendTestEmailMutation = trpc.marketing.testEmail.useMutation({
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(language === "ar" ? "تم إرسال إيميل الاختبار بنجاح" : "Test email sent successfully");
      } else if (result.reason === "missing_config") {
        toast.error(
          language === "ar"
            ? "إعدادات SMTP ناقصة في .env"
            : "SMTP configuration is missing in .env"
        );
      } else {
        toast.error(
          language === "ar"
            ? "فشل الاتصال بخادم البريد SMTP"
            : "SMTP transport failed"
        );
      }
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AdminLayout title={t.settings.title}>
      <div className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" />Admin Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary font-black text-2xl">
                {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
              </div>
              <div>
                <div className="font-semibold text-foreground text-lg">{user?.name ?? "Admin"}</div>
                <div className="text-sm text-muted-foreground">{user?.email ?? "No email"}</div>
                <div className="text-xs text-primary mt-1 font-medium uppercase tracking-wide">Administrator</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Dumbbell className="w-4 h-4 text-primary" />Platform Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { label: "Platform", value: "GymOS v1.0" },
                { label: "Stack", value: "React + tRPC + MongoDB Atlas" },
                { label: "Auth", value: "JWT + External Auth" },
                { label: "Role", value: "Admin" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Access Control */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Access Control</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To promote a user to admin, update the <code className="bg-secondary px-1 rounded text-foreground">role</code> field in the database directly via the Database panel.
            </p>
            <div className="bg-secondary/50 rounded-lg p-3 text-xs font-mono text-muted-foreground">
              {'db.users.updateOne({ email: "user@example.com" }, { $set: { role: "admin" } });'}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-primary" />Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In-app notifications are automatically sent for subscription expirations, new orders, low stock alerts, and payment confirmations.
            </p>
          </CardContent>
        </Card>

        {/* Email Test */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />Email Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {language === "ar"
                ? "أرسل رسالة اختبار للتأكد أن إعدادات SMTP تعمل بشكل صحيح."
                : "Send a test email to verify SMTP configuration is working correctly."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="test-email-address">Test Email Address</Label>
              <Input
                id="test-email-address"
                type="email"
                value={testEmail}
                placeholder="you@example.com"
                onChange={(event) => setTestEmail(event.target.value)}
              />
            </div>
            <Button
              onClick={() =>
                sendTestEmailMutation.mutate({
                  email: testEmail.trim(),
                })
              }
              disabled={sendTestEmailMutation.isPending || !testEmail.trim()}
            >
              {sendTestEmailMutation.isPending
                ? t.common.loading
                : language === "ar"
                  ? "إرسال اختبار البريد"
                  : "Send Test Email"}
            </Button>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4 text-primary" />Database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              GymOS uses MongoDB Atlas with collections covering trainees, trainers, subscriptions, payments, workouts, attendance, progress, supplements, marketing, and notifications.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {["users", "trainees", "trainers", "subscriptions", "payments", "workout_plans", "workout_days", "exercises", "attendance", "progress_records", "supplements", "supplement_orders", "marketing_campaigns", "notifications"].map((table) => (
                <div key={table} className="bg-secondary/50 rounded px-2 py-1 font-mono">{table}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
