import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Megaphone, Plus, Send, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  sent: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

type CampaignFormState = {
  title: string;
  message: string;
  targetAudience: "all" | "active" | "expired" | "by_plan" | "by_goal";
  targetPlanId: string;
  targetGoal: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | "";
  channel: "in_app" | "sms" | "whatsapp" | "email" | "telegram" | "both";
  scheduledAt: string;
};

const emptyForm: CampaignFormState = {
  title: "",
  message: "",
  targetAudience: "all",
  targetPlanId: "none",
  targetGoal: "",
  channel: "both",
  scheduledAt: "",
};

export default function AdminMarketing() {
  const { t, language } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<CampaignFormState>(emptyForm);
  const limit = 15;

  const ui = language === "ar"
    ? {
        newCampaign: "حملة جديدة",
        deleteCampaign: "حذف الحملة؟",
        noCampaignsTitle: "لا توجد حملات بعد",
        noCampaignsSub: "أنشئ أول حملة تسويقية للتواصل مع المتدربين.",
        createCampaignTitle: "إنشاء حملة",
        campaignTitle: "عنوان الحملة",
        audience: "الفئة المستهدفة",
        channel: "القناة",
        allStatuses: "كل الحالات",
        draft: "مسودة",
        scheduled: "مجدولة",
        sent: "مرسلة",
        cancelled: "ملغاة",
        recipientCount: "المستلمين",
        scheduledAt: "موعد الإرسال",
        targetPlan: "الخطة المستهدفة",
        targetGoal: "الهدف المستهدف",
        noPlan: "بدون خطة",
        sendNow: "إرسال الآن",
        cancelCampaign: "إلغاء الحملة",
        page: "صفحة",
        of: "من",
      }
    : {
        newCampaign: "New Campaign",
        deleteCampaign: "Delete this campaign?",
        noCampaignsTitle: "No campaigns yet",
        noCampaignsSub: "Create your first marketing campaign to engage with your trainees.",
        createCampaignTitle: "Create Campaign",
        campaignTitle: "Campaign Title",
        audience: "Target Audience",
        channel: "Channel",
        allStatuses: "All Statuses",
        draft: "Draft",
        scheduled: "Scheduled",
        sent: "Sent",
        cancelled: "Cancelled",
        recipientCount: "Recipients",
        scheduledAt: "Scheduled At",
        targetPlan: "Target Plan",
        targetGoal: "Target Goal",
        noPlan: "No plan",
        sendNow: "Send Now",
        cancelCampaign: "Cancel Campaign",
        page: "Page",
        of: "of",
      };

  const campaignsQuery = trpc.marketing.campaigns.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit,
    offset: page * limit,
  });
  const plansQuery = trpc.subscriptions.plans.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.marketing.createCampaign.useMutation({
    onSuccess: () => {
      utils.marketing.campaigns.invalidate();
      setShowCreate(false);
      setForm(emptyForm);
      toast.success(t.marketing.createCampaign);
    },
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.marketing.sendCampaign.useMutation({
    onSuccess: (result) => {
      utils.marketing.campaigns.invalidate();
      toast.success(`${t.marketing.sendNow} (${result.recipients})`);
      if (result.telegramStatus === "failed") {
        const reasonLabel =
          result.telegramReason === "missing_config"
            ? language === "ar"
              ? "الإعدادات ناقصة (BOT_TOKEN أو CHAT_ID)"
              : "missing config (BOT_TOKEN or CHAT_ID)"
            : result.telegramReason === "network_error"
              ? language === "ar"
                ? "خطأ شبكة أثناء الاتصال بـ Telegram"
                : "network error reaching Telegram"
              : language === "ar"
                ? "رفض من Telegram API"
                : "Telegram API rejected request";
        toast.error(
          language === "ar"
            ? `فشل الإرسال عبر تيليجرام: ${reasonLabel}`
            : `Telegram send failed: ${reasonLabel}`
        );
      }
      if (result.emailStatus === "failed") {
        const reasonLabel =
          result.emailReason === "missing_config"
            ? language === "ar"
              ? "إعدادات SMTP ناقصة"
              : "missing SMTP configuration"
            : language === "ar"
              ? "فشل الاتصال بخادم البريد"
              : "SMTP transport error";
        toast.error(
          language === "ar"
            ? `فشل الإرسال عبر البريد الإلكتروني: ${reasonLabel}`
            : `Email send failed: ${reasonLabel}`
        );
      } else if (result.emailStatus === "sent") {
        toast.success(
          language === "ar"
            ? `تم إرسال البريد الإلكتروني: ${result.emailSentCount}`
            : `Email sent: ${result.emailSentCount}`
        );
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.marketing.updateCampaign.useMutation({
    onSuccess: () => {
      utils.marketing.campaigns.invalidate();
      toast.success(ui.cancelled);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.marketing.deleteCampaign.useMutation({
    onSuccess: () => {
      utils.marketing.campaigns.invalidate();
      toast.success(t.common.delete);
    },
    onError: (e) => toast.error(e.message),
  });

  const campaigns = campaignsQuery.data?.data ?? [];
  const total = campaignsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const audienceLabel = (value: string) => {
    switch (value) {
      case "active":
        return t.marketing.activeMembers;
      case "expired":
        return t.marketing.expiredMembers;
      case "by_plan":
        return language === "ar" ? "حسب الخطة" : "By Plan";
      case "by_goal":
        return language === "ar" ? "حسب الهدف" : "By Goal";
      case "all":
      default:
        return t.marketing.allMembers;
    }
  };

  const goalOptions = useMemo(
    () => [
      { value: "weight_loss", label: t.trainees.weightLoss },
      { value: "muscle_gain", label: t.trainees.muscleGain },
      { value: "fitness", label: t.trainees.generalFitness },
      { value: "rehab", label: t.trainees.rehabilitation },
      { value: "other", label: language === "ar" ? "أخرى" : "Other" },
    ],
    [language, t.trainees.generalFitness, t.trainees.muscleGain, t.trainees.rehabilitation, t.trainees.weightLoss]
  );

  const submitCreateCampaign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({
      title: form.title.trim(),
      message: form.message.trim(),
      targetAudience: form.targetAudience,
      targetPlanId: form.targetAudience === "by_plan" && form.targetPlanId !== "none" ? Number(form.targetPlanId) : undefined,
      targetGoal: form.targetAudience === "by_goal" && form.targetGoal ? form.targetGoal : undefined,
      channel: form.channel,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined,
    });
  };

  return (
    <AdminLayout title={t.marketing.title}>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder={ui.allStatuses} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ui.allStatuses}</SelectItem>
            <SelectItem value="draft">{ui.draft}</SelectItem>
            <SelectItem value="scheduled">{ui.scheduled}</SelectItem>
            <SelectItem value="sent">{ui.sent}</SelectItem>
            <SelectItem value="cancelled">{ui.cancelled}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {ui.newCampaign}
        </Button>
      </div>

      {campaignsQuery.isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">{ui.noCampaignsTitle}</h3>
          <p className="text-muted-foreground text-sm mb-4">{ui.noCampaignsSub}</p>
          <Button onClick={() => setShowCreate(true)}>{t.marketing.createCampaign}</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="bg-card border-border hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{campaign.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={STATUS_COLORS[campaign.status] ?? "bg-gray-500/20 text-gray-400"}>{campaign.status}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{campaign.channel ?? "in_app"}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{campaign.message}</p>
                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  <div>{ui.audience}: <span className="text-foreground">{audienceLabel(campaign.targetAudience ?? "all")}</span></div>
                  <div>{ui.recipientCount}: <span className="text-foreground">{campaign.recipientCount ?? 0}</span></div>
                  {campaign.scheduledAt ? (
                    <div>{ui.scheduledAt}: <span className="text-foreground">{new Date(campaign.scheduledAt as any).toLocaleString()}</span></div>
                  ) : null}
                  {campaign.sentAt ? (
                    <div>{t.marketing.sentAt}: <span className="text-foreground">{new Date(campaign.sentAt as any).toLocaleString()}</span></div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {(campaign.status === "draft" || campaign.status === "scheduled") ? (
                    <Button size="sm" className="flex-1 gap-1" onClick={() => sendMutation.mutate({ id: campaign.id })} disabled={sendMutation.isPending}>
                      <Send className="w-3 h-3" />
                      {ui.sendNow}
                    </Button>
                  ) : null}
                  {(campaign.status === "draft" || campaign.status === "scheduled") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => cancelMutation.mutate({ id: campaign.id, status: "cancelled" })}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="w-3 h-3" />
                      {ui.cancelCampaign}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(ui.deleteCampaign)) deleteMutation.mutate({ id: campaign.id }); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
            {t.common.previous}
          </Button>
          <span className="text-sm text-muted-foreground">{ui.page} {page + 1} {ui.of} {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((current) => current + 1)}>
            {t.common.next}
          </Button>
        </div>
      ) : null}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{ui.createCampaignTitle}</DialogTitle></DialogHeader>
          <form onSubmit={submitCreateCampaign} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{ui.campaignTitle} *</Label>
              <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t.marketing.message} *</Label>
              <Textarea
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                rows={4}
                className="bg-input border-border resize-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{ui.audience}</Label>
                <Select value={form.targetAudience} onValueChange={(value) => setForm((prev) => ({ ...prev, targetAudience: value as CampaignFormState["targetAudience"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.marketing.allMembers}</SelectItem>
                    <SelectItem value="active">{t.marketing.activeMembers}</SelectItem>
                    <SelectItem value="expired">{t.marketing.expiredMembers}</SelectItem>
                    <SelectItem value="by_plan">{language === "ar" ? "حسب الخطة" : "By Plan"}</SelectItem>
                    <SelectItem value="by_goal">{language === "ar" ? "حسب الهدف" : "By Goal"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{ui.channel}</Label>
                <Select value={form.channel} onValueChange={(value) => setForm((prev) => ({ ...prev, channel: value as CampaignFormState["channel"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">In-App</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="both">In-App + Telegram + Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.targetAudience === "by_plan" ? (
              <div className="space-y-1.5">
                <Label>{ui.targetPlan}</Label>
                <Select value={form.targetPlanId} onValueChange={(value) => setForm((prev) => ({ ...prev, targetPlanId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ui.noPlan}</SelectItem>
                    {(plansQuery.data ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {form.targetAudience === "by_goal" ? (
              <div className="space-y-1.5">
                <Label>{ui.targetGoal}</Label>
                <Select value={form.targetGoal || "none"} onValueChange={(value) => setForm((prev) => ({ ...prev, targetGoal: value === "none" ? "" : value as CampaignFormState["targetGoal"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === "ar" ? "بدون هدف" : "No goal"}</SelectItem>
                    {goalOptions.map((goal) => (
                      <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>{ui.scheduledAt}</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? t.common.loading : t.marketing.createCampaign}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
