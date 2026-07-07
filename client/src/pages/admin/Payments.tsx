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
import { CreditCard, DollarSign, Pencil, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type PaymentMethod = "cash" | "card" | "wallet" | "transfer";
type PaymentType = "subscription" | "supplement" | "other";

type PaymentFormState = {
  traineeId: string;
  amount: string;
  discount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  receiptNumber: string;
  notes: string;
  type: PaymentType;
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: "bg-green-500/20 text-green-400",
  card: "bg-blue-500/20 text-blue-400",
  wallet: "bg-purple-500/20 text-purple-400",
  transfer: "bg-orange-500/20 text-orange-400",
};

const todayISO = () => new Date().toISOString().split("T")[0];
const parseMoney = (value: string) => Number(value || "0");
const toDateInput = (value: string | Date | undefined) => {
  if (!value) return todayISO();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayISO();
  return date.toISOString().split("T")[0];
};

export default function AdminPayments() {
  const { t, language } = useLanguage();

  const ui = language === "ar"
    ? {
        thisMonth: "هذا الشهر",
        paymentsCount: "عدد المدفوعات",
        avgPayment: "متوسط الدفعة",
        paymentHistory: "سجل المدفوعات",
        addPayment: "إضافة دفعة",
        editPayment: "تعديل الدفعة",
        trainee: "المتدرب",
        date: "التاريخ",
        amount: "المبلغ",
        method: "الطريقة",
        type: "النوع",
        receipt: "الإيصال",
        notes: "ملاحظات",
        actions: "الإجراءات",
        allTypes: "كل الأنواع",
        dateFrom: "من تاريخ",
        dateTo: "إلى تاريخ",
        noPaymentsFound: "لا توجد مدفوعات",
        showing: "عرض",
        of: "من",
        previous: "السابق",
        next: "التالي",
        save: "حفظ",
        cancel: "إلغاء",
        deleteConfirm: "حذف هذه الدفعة؟",
        finalAmount: "المبلغ النهائي",
      }
    : {
        thisMonth: "This Month",
        paymentsCount: "Payments Count",
        avgPayment: "Avg Payment",
        paymentHistory: "Payment History",
        addPayment: "Add Payment",
        editPayment: "Edit Payment",
        trainee: "Trainee",
        date: "Date",
        amount: "Amount",
        method: "Method",
        type: "Type",
        receipt: "Receipt",
        notes: "Notes",
        actions: "Actions",
        allTypes: "All Types",
        dateFrom: "Date From",
        dateTo: "Date To",
        noPaymentsFound: "No payments found",
        showing: "Showing",
        of: "of",
        previous: "Previous",
        next: "Next",
        save: "Save",
        cancel: "Cancel",
        deleteConfirm: "Delete this payment?",
        finalAmount: "Final Amount",
      };

  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [form, setForm] = useState<PaymentFormState>({
    traineeId: "",
    amount: "",
    discount: "0",
    paymentMethod: "cash",
    paymentDate: todayISO(),
    receiptNumber: "",
    notes: "",
    type: "subscription",
  });

  const limit = 25;
  const queryStartDate = startDate ? new Date(`${startDate}T00:00:00`) : undefined;
  const queryEndDate = endDate ? new Date(`${endDate}T23:59:59`) : undefined;

  const paymentsQuery = trpc.payments.list.useQuery({
    method: filterMethod !== "all" ? filterMethod : undefined,
    type: filterType !== "all" ? filterType : undefined,
    startDate: queryStartDate,
    endDate: queryEndDate,
    limit,
    offset: page * limit,
  });
  const statsQuery = trpc.payments.revenueStats.useQuery();
  const traineesQuery = trpc.trainees.list.useQuery({ limit: 5000, offset: 0 });
  const utils = trpc.useUtils();

  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.payments.list.invalidate(), utils.payments.revenueStats.invalidate()]);
      setOpenDialog(false);
      toast.success(t.payments.recordPayment);
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePaymentMutation = trpc.payments.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.payments.list.invalidate(), utils.payments.revenueStats.invalidate()]);
      setOpenDialog(false);
      toast.success(t.payments.editPayment);
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.payments.list.invalidate(), utils.payments.revenueStats.invalidate()]);
      toast.success(t.common.delete);
    },
    onError: (error) => toast.error(error.message),
  });

  const payments = paymentsQuery.data?.data ?? [];
  const total = paymentsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const stats = statsQuery.data;
  const trainees = traineesQuery.data?.data ?? [];
  const traineeNameById = useMemo(() => {
    return new Map(trainees.map((trainee) => [trainee.id, trainee.fullName]));
  }, [trainees]);

  const methodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return t.payments.cash;
      case "card":
        return t.payments.card;
      case "wallet":
        return language === "ar" ? "محفظة" : "Wallet";
      case "transfer":
        return language === "ar" ? "تحويل" : "Transfer";
      default:
        return method;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "subscription":
        return language === "ar" ? "اشتراك" : "Subscription";
      case "supplement":
        return language === "ar" ? "مكملات" : "Supplement";
      case "other":
        return language === "ar" ? "أخرى" : "Other";
      default:
        return type;
    }
  };

  const computedFinalAmount = Math.max(0, parseMoney(form.amount) - parseMoney(form.discount || "0"));

  const openCreateDialog = () => {
    setEditingPaymentId(null);
    setForm({
      traineeId: "",
      amount: "",
      discount: "0",
      paymentMethod: "cash",
      paymentDate: todayISO(),
      receiptNumber: "",
      notes: "",
      type: "subscription",
    });
    setOpenDialog(true);
  };

  const openEditDialog = (payment: any) => {
    setEditingPaymentId(payment.id);
    setForm({
      traineeId: String(payment.traineeId),
      amount: payment.amount ?? "",
      discount: payment.discount ?? "0",
      paymentMethod: payment.paymentMethod ?? "cash",
      paymentDate: toDateInput(payment.paymentDate),
      receiptNumber: payment.receiptNumber ?? "",
      notes: payment.notes ?? "",
      type: payment.type ?? "subscription",
    });
    setOpenDialog(true);
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.traineeId) {
      toast.error(t.subscriptions.selectTrainee);
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error(`${t.payments.amount} ${t.common.required}`);
      return;
    }

    const payload = {
      traineeId: Number(form.traineeId),
      amount: form.amount,
      discount: form.discount || "0",
      finalAmount: computedFinalAmount.toFixed(2),
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      receiptNumber: form.receiptNumber || undefined,
      notes: form.notes || undefined,
      type: form.type,
    } as const;

    if (editingPaymentId) {
      updatePaymentMutation.mutate({ id: editingPaymentId, ...payload });
      return;
    }
    createPaymentMutation.mutate(payload);
  };

  return (
    <AdminLayout title={t.payments.title}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t.payments.totalRevenue, value: `$${stats?.total?.toLocaleString() ?? 0}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
          { label: ui.thisMonth, value: `$${stats?.monthly?.toLocaleString() ?? 0}`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
          { label: ui.paymentsCount, value: total.toLocaleString(), icon: CreditCard, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: ui.avgPayment, value: total > 0 ? `$${((stats?.total ?? 0) / total).toFixed(0)}` : "$0", icon: Wallet, color: "text-yellow-400", bg: "bg-yellow-400/10" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterMethod} onValueChange={(value) => { setFilterMethod(value); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t.payments.allMethods} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.payments.allMethods}</SelectItem>
            <SelectItem value="cash">{methodLabel("cash")}</SelectItem>
            <SelectItem value="card">{methodLabel("card")}</SelectItem>
            <SelectItem value="wallet">{methodLabel("wallet")}</SelectItem>
            <SelectItem value="transfer">{methodLabel("transfer")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(value) => { setFilterType(value); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder={ui.allTypes} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ui.allTypes}</SelectItem>
            <SelectItem value="subscription">{typeLabel("subscription")}</SelectItem>
            <SelectItem value="supplement">{typeLabel("supplement")}</SelectItem>
            <SelectItem value="other">{typeLabel("other")}</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" className="w-44" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(0); }} />
        <Input type="date" className="w-44" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(0); }} />

        <Button onClick={openCreateDialog} className="gap-2 ms-auto">
          <Plus className="w-4 h-4" />
          {ui.addPayment}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{ui.paymentHistory}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start p-4 text-muted-foreground font-medium">{ui.trainee}</th>
                  <th className="text-start p-4 text-muted-foreground font-medium">{ui.date}</th>
                  <th className="text-start p-4 text-muted-foreground font-medium">{ui.amount}</th>
                  <th className="text-start p-4 text-muted-foreground font-medium">{ui.method}</th>
                  <th className="text-start p-4 text-muted-foreground font-medium">{ui.type}</th>
                  <th className="text-start p-4 text-muted-foreground font-medium hidden lg:table-cell">{ui.receipt}</th>
                  <th className="text-start p-4 text-muted-foreground font-medium">{ui.actions}</th>
                </tr>
              </thead>
              <tbody>
                {paymentsQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, row) => (
                    <tr key={row} className="border-b border-border">
                      {Array.from({ length: 7 }).map((__, cell) => (
                        <td key={cell} className="p-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">{ui.noPaymentsFound}</td></tr>
                ) : (
                  payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-4 font-medium text-foreground">{traineeNameById.get(payment.traineeId) ?? `#${payment.traineeId}`}</td>
                      <td className="p-4 text-muted-foreground">{new Date(payment.paymentDate as any).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}</td>
                      <td className="p-4">
                        <span className="font-bold text-primary">${payment.finalAmount}</span>
                        {payment.discount && Number(payment.discount) > 0 ? (
                          <span className="text-xs text-muted-foreground ms-1">(-${payment.discount})</span>
                        ) : null}
                      </td>
                      <td className="p-4">
                        <Badge className={METHOD_COLORS[payment.paymentMethod as PaymentMethod] ?? "bg-gray-500/20 text-gray-400"}>
                          {methodLabel(payment.paymentMethod)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs">
                          {typeLabel(payment.type)}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs hidden lg:table-cell">{payment.receiptNumber ?? "--"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(payment)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (!confirm(ui.deleteConfirm)) return;
                              deletePaymentMutation.mutate({ id: payment.id });
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
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-sm text-muted-foreground">{ui.showing} {page * limit + 1}-{Math.min((page + 1) * limit, total)} {ui.of} {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>{ui.previous}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((current) => current + 1)}>{ui.next}</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingPaymentId ? ui.editPayment : ui.addPayment}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitPayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{ui.trainee} *</Label>
              <Select value={form.traineeId} onValueChange={(value) => setForm((prev) => ({ ...prev, traineeId: value }))}>
                <SelectTrigger><SelectValue placeholder={t.subscriptions.selectTrainee} /></SelectTrigger>
                <SelectContent>
                  {trainees.map((trainee) => (
                    <SelectItem key={trainee.id} value={String(trainee.id)}>{trainee.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{ui.amount} *</Label>
                <Input value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="49.99" />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "ar" ? "الخصم" : "Discount"}</Label>
                <Input value={form.discount} onChange={(event) => setForm((prev) => ({ ...prev, discount: event.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>{ui.finalAmount}</Label>
                <Input value={computedFinalAmount.toFixed(2)} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>{ui.date} *</Label>
                <Input type="date" value={form.paymentDate} onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{ui.method} *</Label>
                <Select value={form.paymentMethod} onValueChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{methodLabel("cash")}</SelectItem>
                    <SelectItem value="card">{methodLabel("card")}</SelectItem>
                    <SelectItem value="wallet">{methodLabel("wallet")}</SelectItem>
                    <SelectItem value="transfer">{methodLabel("transfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{ui.type}</Label>
                <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as PaymentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">{typeLabel("subscription")}</SelectItem>
                    <SelectItem value="supplement">{typeLabel("supplement")}</SelectItem>
                    <SelectItem value="other">{typeLabel("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{ui.receipt}</Label>
                <Input value={form.receiptNumber} onChange={(event) => setForm((prev) => ({ ...prev, receiptNumber: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{ui.notes}</Label>
                <Input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenDialog(false)}>
                {ui.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}>
                {ui.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
