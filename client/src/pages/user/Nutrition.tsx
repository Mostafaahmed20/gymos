import UserLayout from "@/components/UserLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Apple, Printer } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type NutritionGoal = "weight_loss" | "muscle_gain" | "maintenance" | "cutting" | "bulking";
type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Pre-Workout" | "Post-Workout";

const mealBorderClass: Record<MealName, string> = {
  Breakfast: "border-sky-500",
  Lunch: "border-orange-500",
  Dinner: "border-violet-500",
  Snack: "border-emerald-500",
  "Pre-Workout": "border-red-500",
  "Post-Workout": "border-yellow-400",
};

const macroColor = {
  calories: "#ef4444",
  protein: "#3b82f6",
  carbs: "#f97316",
  fat: "#facc15",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function UserNutrition() {
  const { t, language } = useLanguage();
  const planQuery = trpc.nutrition.getMyPlan.useQuery();

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

  const mealLabel = (value: MealName) => {
    switch (value) {
      case "Breakfast":
        return t.nutrition.breakfast;
      case "Lunch":
        return t.nutrition.lunch;
      case "Dinner":
        return t.nutrition.dinner;
      case "Snack":
        return t.nutrition.snack;
      case "Pre-Workout":
        return t.nutrition.preWorkout;
      case "Post-Workout":
        return t.nutrition.postWorkout;
      default:
        return value;
    }
  };

  const data = planQuery.data;
  const plan = data?.plan;
  const assignment = data?.assignment;

  const totals = useMemo(
    () => ({
      calories: Number(plan?.totalCalories ?? 0),
      protein: Number(plan?.totalProtein ?? 0),
      carbs: Number(plan?.totalCarbs ?? 0),
      fat: Number(plan?.totalFat ?? 0),
    }),
    [plan?.totalCalories, plan?.totalProtein, plan?.totalCarbs, plan?.totalFat]
  );

  const macroPieData = useMemo(() => {
    const macroSum = totals.protein + totals.carbs + totals.fat;
    if (macroSum <= 0) {
      return [
        { name: t.nutrition.protein, value: 0, color: macroColor.protein },
        { name: t.nutrition.carbs, value: 0, color: macroColor.carbs },
        { name: t.nutrition.fat, value: 0, color: macroColor.fat },
      ];
    }
    return [
      { name: t.nutrition.protein, value: Number(((totals.protein / macroSum) * 100).toFixed(1)), color: macroColor.protein },
      { name: t.nutrition.carbs, value: Number(((totals.carbs / macroSum) * 100).toFixed(1)), color: macroColor.carbs },
      { name: t.nutrition.fat, value: Number(((totals.fat / macroSum) * 100).toFixed(1)), color: macroColor.fat },
    ];
  }, [t.nutrition.carbs, t.nutrition.fat, t.nutrition.protein, totals.carbs, totals.fat, totals.protein]);

  const remainingDays = assignment?.endDate
    ? Math.max(0, Math.ceil((new Date(String(assignment.endDate)).getTime() - Date.now()) / 86400000))
    : 0;

  const handlePrint = () => {
    if (!plan || !assignment) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1000,height=900");
    if (!popup) return;

    const mealsMarkup = (plan.meals ?? [])
      .map((meal: any) => {
        const foodsMarkup = (meal.foods ?? [])
          .map(
            (food: any) => `
              <tr>
                <td>${escapeHtml(String(food.foodName ?? ""))}</td>
                <td>${escapeHtml(String(food.quantity ?? "0"))} ${escapeHtml(String(food.unit ?? ""))}</td>
                <td>${escapeHtml(String(food.calories ?? 0))}</td>
                <td>${escapeHtml(String(food.protein ?? 0))}</td>
                <td>${escapeHtml(String(food.carbs ?? 0))}</td>
                <td>${escapeHtml(String(food.fat ?? 0))}</td>
              </tr>
            `
          )
          .join("");

        return `
          <section style="margin: 16px 0; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
            <h3 style="margin:0; padding: 12px 16px; background:#f7f7f7;">${escapeHtml(mealLabel(meal.mealName as MealName))}</h3>
            <table style="width:100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background:#fafafa;">
                  <th style="padding: 8px; border-bottom:1px solid #eee; text-align:${language === "ar" ? "right" : "left"};">${escapeHtml(t.nutrition.foodName)}</th>
                  <th style="padding: 8px; border-bottom:1px solid #eee; text-align:${language === "ar" ? "right" : "left"};">${escapeHtml(t.nutrition.quantity)}</th>
                  <th style="padding: 8px; border-bottom:1px solid #eee; text-align:${language === "ar" ? "right" : "left"};">${escapeHtml(t.nutrition.calories)}</th>
                  <th style="padding: 8px; border-bottom:1px solid #eee; text-align:${language === "ar" ? "right" : "left"};">${escapeHtml(t.nutrition.protein)}</th>
                  <th style="padding: 8px; border-bottom:1px solid #eee; text-align:${language === "ar" ? "right" : "left"};">${escapeHtml(t.nutrition.carbs)}</th>
                  <th style="padding: 8px; border-bottom:1px solid #eee; text-align:${language === "ar" ? "right" : "left"};">${escapeHtml(t.nutrition.fat)}</th>
                </tr>
              </thead>
              <tbody>${foodsMarkup}</tbody>
            </table>
          </section>
        `;
      })
      .join("");

    popup.document.write(`
      <!doctype html>
      <html lang="${language}" dir="${language === "ar" ? "rtl" : "ltr"}">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(plan.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
            .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
            .box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
            @media print { button { display:none; } }
          </style>
        </head>
        <body>
          <h1 style="margin-bottom: 4px;">${escapeHtml(plan.name)}</h1>
          <div>${escapeHtml(goalLabel(plan.goal as NutritionGoal))}</div>
          <div class="meta">
            <div class="box">${escapeHtml(t.nutrition.calories)}: ${escapeHtml(String(totals.calories))}</div>
            <div class="box">${escapeHtml(t.nutrition.protein)}: ${escapeHtml(String(totals.protein))}</div>
            <div class="box">${escapeHtml(t.nutrition.carbs)}: ${escapeHtml(String(totals.carbs))}</div>
            <div class="box">${escapeHtml(t.nutrition.fat)}: ${escapeHtml(String(totals.fat))}</div>
          </div>
          <p style="margin-top: 10px;">${escapeHtml(t.nutrition.remainingDays)}: ${escapeHtml(String(remainingDays))}</p>
          ${mealsMarkup}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <UserLayout title={t.nutrition.myPlan}>
      {planQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !plan || !assignment ? (
        <div className="text-center py-16">
          <Apple className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">{t.nutrition.noPlanAssigned}</h3>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  <Badge className="bg-primary/20 text-primary">{goalLabel(plan.goal as NutritionGoal)}</Badge>
                </div>
                {plan.description ? <p className="text-sm text-muted-foreground mt-1">{plan.description}</p> : null}
                <p className="text-xs text-muted-foreground mt-2">
                  {t.nutrition.remainingDays}: <span className="text-foreground font-semibold">{remainingDays}</span>
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                {t.nutrition.printExport}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MacroCard label={t.nutrition.calories} value={totals.calories} color={macroColor.calories} unit="kcal" />
            <MacroCard label={t.nutrition.protein} value={totals.protein} color={macroColor.protein} unit="g" />
            <MacroCard label={t.nutrition.carbs} value={totals.carbs} color={macroColor.carbs} unit="g" />
            <MacroCard label={t.nutrition.fat} value={totals.fat} color={macroColor.fat} unit="g" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t.nutrition.meals}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-3">
                  {(plan.meals ?? []).map((meal: any) => {
                    const totalMealCalories = Number(meal.totalCalories ?? 0);
                    return (
                      <AccordionItem
                        key={meal.id}
                        value={`meal-${meal.id}`}
                        className={`rounded-lg border border-border bg-secondary/10 border-s-4 ${mealBorderClass[meal.mealName as MealName] ?? "border-primary"} px-3`}
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="font-semibold text-foreground">{mealLabel(meal.mealName as MealName)}</span>
                            <span className="text-xs text-muted-foreground">{totalMealCalories} kcal</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/70 text-muted-foreground">
                                  <th className="text-start p-2">{t.nutrition.foodName}</th>
                                  <th className="text-start p-2">{t.nutrition.quantity}</th>
                                  <th className="text-start p-2">{t.nutrition.calories}</th>
                                  <th className="text-start p-2">{t.nutrition.protein}</th>
                                  <th className="text-start p-2">{t.nutrition.carbs}</th>
                                  <th className="text-start p-2">{t.nutrition.fat}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(meal.foods ?? []).map((food: any) => (
                                  <tr key={food.id} className="border-b border-border/50">
                                    <td className="p-2 text-foreground">{food.foodName}</td>
                                    <td className="p-2 text-muted-foreground">{food.quantity} {food.unit}</td>
                                    <td className="p-2 text-red-400">{food.calories}</td>
                                    <td className="p-2 text-blue-400">{food.protein}</td>
                                    <td className="p-2 text-orange-400">{food.carbs}</td>
                                    <td className="p-2 text-yellow-300">{food.fat}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t.nutrition.macroBreakdown}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={macroPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={86} paddingAngle={3}>
                        {macroPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  {macroPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                      </span>
                      <span className="font-semibold text-foreground">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

function MacroCard({
  label,
  value,
  color,
  unit,
}: {
  label: string;
  value: number;
  color: string;
  unit: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-black" style={{ color }}>
          {Number(value.toFixed(1))} {unit}
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: "100%", backgroundColor: color }} />
        </div>
      </CardContent>
    </Card>
  );
}
