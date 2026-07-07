import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

type NutritionGoal = "weight_loss" | "muscle_gain" | "maintenance" | "cutting" | "bulking";
type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Pre-Workout" | "Post-Workout";
type NutritionUnit = "grams" | "ml" | "pieces" | "cups";

type FoodForm = {
  id?: number;
  localId: string;
  foodName: string;
  quantity: string;
  unit: NutritionUnit;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
};

type MealForm = {
  id?: number;
  localId: string;
  mealName: MealName;
  mealOrder: number;
  foods: FoodForm[];
};

const GOAL_OPTIONS: NutritionGoal[] = ["weight_loss", "muscle_gain", "maintenance", "cutting", "bulking"];
const MEAL_OPTIONS: MealName[] = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-Workout", "Post-Workout"];
const UNIT_OPTIONS: NutritionUnit[] = ["grams", "ml", "pieces", "cups"];

const MEAL_BORDER_CLASS: Record<MealName, string> = {
  Breakfast: "border-blue-500",
  Lunch: "border-orange-500",
  Dinner: "border-violet-500",
  Snack: "border-emerald-500",
  "Pre-Workout": "border-red-500",
  "Post-Workout": "border-amber-400",
};

const macroColors = {
  protein: "#3b82f6",
  carbs: "#f97316",
  fat: "#facc15",
};

function createMeal(index: number, mealName: MealName = "Breakfast"): MealForm {
  return {
    localId: crypto.randomUUID(),
    mealName,
    mealOrder: index + 1,
    foods: [],
  };
}

function createFood(): FoodForm {
  return {
    localId: crypto.randomUUID(),
    foodName: "",
    quantity: "",
    unit: "grams",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
  };
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdminNutritionEditor() {
  const { t } = useLanguage();
  const params = useParams<{ id?: string }>();
  const [location, setLocation] = useLocation();
  const isEdit = location.includes("/edit");
  const planId = Number(params.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState<NutritionGoal>("maintenance");
  const [isTemplate, setIsTemplate] = useState(false);
  const [meals, setMeals] = useState<MealForm[]>([createMeal(0)]);
  const [draggingMealId, setDraggingMealId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const planQuery = trpc.nutrition.getPlanById.useQuery(
    { id: planId },
    { enabled: isEdit && Number.isFinite(planId) && planId > 0 }
  );

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

  const unitLabel = (value: NutritionUnit) => {
    switch (value) {
      case "grams":
        return t.nutrition.grams;
      case "ml":
        return t.nutrition.ml;
      case "pieces":
        return t.nutrition.pieces;
      case "cups":
        return t.nutrition.cups;
      default:
        return value;
    }
  };

  useEffect(() => {
    if (!planQuery.data) return;
    const plan = planQuery.data;
    setName(plan.name ?? "");
    setDescription(plan.description ?? "");
    setGoal((plan.goal as NutritionGoal) ?? "maintenance");
    setIsTemplate(Boolean(plan.isTemplate));
    const mappedMeals: MealForm[] = (plan.meals ?? []).map((meal: any, mealIndex: number) => ({
      id: meal.id,
      localId: crypto.randomUUID(),
      mealName: meal.mealName as MealName,
      mealOrder: Number(meal.mealOrder ?? mealIndex + 1),
      foods: (meal.foods ?? []).map((food: any) => ({
        id: food.id,
        localId: crypto.randomUUID(),
        foodName: food.foodName ?? "",
        quantity: String(food.quantity ?? ""),
        unit: (food.unit as NutritionUnit) ?? "grams",
        calories: String(food.calories ?? ""),
        protein: String(food.protein ?? ""),
        carbs: String(food.carbs ?? ""),
        fat: String(food.fat ?? ""),
        notes: food.notes ?? "",
      })),
    }));
    setMeals(mappedMeals.length > 0 ? mappedMeals : [createMeal(0)]);
  }, [planQuery.data]);

  const createPlanMutation = trpc.nutrition.createPlan.useMutation({
    onSuccess: async (createdPlan) => {
      await utils.nutrition.listPlans.invalidate();
      if (createdPlan?.id) {
        setLocation(`/admin/nutrition/${createdPlan.id}/edit`);
      } else {
        setLocation("/admin/nutrition");
      }
      toast.success(t.nutrition.savePlan);
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePlanMutation = trpc.nutrition.updatePlan.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.nutrition.listPlans.invalidate(), utils.nutrition.getPlanById.invalidate({ id: planId })]);
      toast.success(t.nutrition.savePlan);
    },
    onError: (error) => toast.error(error.message),
  });

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        for (const food of meal.foods) {
          acc.calories += toNumber(food.calories);
          acc.protein += toNumber(food.protein);
          acc.carbs += toNumber(food.carbs);
          acc.fat += toNumber(food.fat);
        }
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const macroChartData = useMemo(() => {
    const macroSum = totals.protein + totals.carbs + totals.fat;
    if (macroSum <= 0) {
      return [
        { name: t.nutrition.protein, value: 0, color: macroColors.protein },
        { name: t.nutrition.carbs, value: 0, color: macroColors.carbs },
        { name: t.nutrition.fat, value: 0, color: macroColors.fat },
      ];
    }
    return [
      { name: t.nutrition.protein, value: Number(((totals.protein / macroSum) * 100).toFixed(1)), color: macroColors.protein },
      { name: t.nutrition.carbs, value: Number(((totals.carbs / macroSum) * 100).toFixed(1)), color: macroColors.carbs },
      { name: t.nutrition.fat, value: Number(((totals.fat / macroSum) * 100).toFixed(1)), color: macroColors.fat },
    ];
  }, [t.nutrition.carbs, t.nutrition.fat, t.nutrition.protein, totals.carbs, totals.fat, totals.protein]);

  const addMeal = () => {
    if (meals.length >= 6) {
      toast.error(t.nutrition.maxMealsReached);
      return;
    }
    const nextName = MEAL_OPTIONS[Math.min(meals.length, MEAL_OPTIONS.length - 1)] ?? "Snack";
    setMeals((prev) => [...prev, createMeal(prev.length, nextName)]);
  };

  const removeMeal = (mealLocalId: string) => {
    setMeals((prev) => {
      const next = prev.filter((meal) => meal.localId !== mealLocalId);
      if (next.length === 0) return [createMeal(0)];
      return next.map((meal, index) => ({ ...meal, mealOrder: index + 1 }));
    });
  };

  const updateMeal = (mealLocalId: string, patch: Partial<MealForm>) => {
    setMeals((prev) => prev.map((meal) => (meal.localId === mealLocalId ? { ...meal, ...patch } : meal)));
  };

  const addFood = (mealLocalId: string) => {
    setMeals((prev) => prev.map((meal) => (meal.localId === mealLocalId ? { ...meal, foods: [...meal.foods, createFood()] } : meal)));
  };

  const removeFood = (mealLocalId: string, foodLocalId: string) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.localId === mealLocalId
          ? { ...meal, foods: meal.foods.filter((food) => food.localId !== foodLocalId) }
          : meal
      )
    );
  };

  const updateFood = (mealLocalId: string, foodLocalId: string, patch: Partial<FoodForm>) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.localId === mealLocalId
          ? {
              ...meal,
              foods: meal.foods.map((food) => (food.localId === foodLocalId ? { ...food, ...patch } : food)),
            }
          : meal
      )
    );
  };

  const handleDropMeal = (targetMealId: string) => {
    if (!draggingMealId || draggingMealId === targetMealId) return;
    setMeals((prev) => {
      const fromIndex = prev.findIndex((meal) => meal.localId === draggingMealId);
      const toIndex = prev.findIndex((meal) => meal.localId === targetMealId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((meal, index) => ({ ...meal, mealOrder: index + 1 }));
    });
    setDraggingMealId(null);
  };

  const payloadMeals = useMemo(
    () =>
      meals.map((meal, index) => ({
        mealName: meal.mealName,
        mealOrder: index + 1,
        foods: meal.foods
          .filter((food) => food.foodName.trim().length > 0)
          .map((food) => ({
            foodName: food.foodName.trim(),
            quantity: toNumber(food.quantity),
            unit: food.unit,
            calories: toNumber(food.calories),
            protein: toNumber(food.protein),
            carbs: toNumber(food.carbs),
            fat: toNumber(food.fat),
            notes: food.notes.trim() || undefined,
          })),
      })),
    [meals]
  );

  const handleSave = () => {
    if (!name.trim()) {
      toast.error(t.nutrition.planNameRequired);
      return;
    }

    if (isEdit && Number.isFinite(planId) && planId > 0) {
      updatePlanMutation.mutate({
        id: planId,
        name: name.trim(),
        description: description.trim() || undefined,
        goal,
        isTemplate,
        meals: payloadMeals,
      });
      return;
    }

    createPlanMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      goal,
      isTemplate,
      meals: payloadMeals,
    });
  };

  const isSaving = createPlanMutation.isPending || updatePlanMutation.isPending;

  return (
    <AdminLayout title={isEdit ? t.nutrition.editPlan : t.nutrition.createPlan}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/admin/nutrition">
            <ArrowLeft className="w-4 h-4" />
            {t.common.back}
          </Link>
        </Button>
        <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
          <Save className="w-4 h-4" />
          {isSaving ? t.common.loading : t.nutrition.savePlan}
        </Button>
      </div>

      {isEdit && planQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t.nutrition.planName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t.nutrition.planName} *</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.nutrition.planName} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.nutrition.description}</Label>
                  <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t.nutrition.goal}</Label>
                    <Select value={goal} onValueChange={(value) => setGoal(value as NutritionGoal)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_OPTIONS.map((goalOption) => (
                          <SelectItem key={goalOption} value={goalOption}>
                            {goalLabel(goalOption)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={isTemplate}
                        onChange={(event) => setIsTemplate(event.target.checked)}
                        className="size-4 rounded border border-border bg-background"
                      />
                      {t.nutrition.saveTemplate}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>{t.nutrition.meals}</CardTitle>
                <Button type="button" onClick={addMeal} disabled={meals.length >= 6} className="gap-2" size="sm">
                  <Plus className="w-4 h-4" />
                  {t.nutrition.addMeal}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {meals.map((meal, mealIndex) => (
                  <div
                    key={meal.localId}
                    draggable
                    onDragStart={() => setDraggingMealId(meal.localId)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDropMeal(meal.localId)}
                    className={`rounded-xl border border-border border-s-4 ${MEAL_BORDER_CLASS[meal.mealName]} bg-secondary/10 p-4`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <button type="button" className="text-muted-foreground" title={t.nutrition.dragToReorder}>
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <Badge variant="secondary">#{mealIndex + 1}</Badge>
                      <Select
                        value={meal.mealName}
                        onValueChange={(value) => updateMeal(meal.localId, { mealName: value as MealName })}
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_OPTIONS.map((mealName) => (
                            <SelectItem key={mealName} value={mealName}>
                              {mealLabel(mealName)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="ms-auto flex items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => addFood(meal.localId)} className="gap-1">
                          <Plus className="w-3 h-3" />
                          {t.nutrition.addFood}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeMeal(meal.localId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {meal.foods.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.nutrition.addFood}</p>
                    ) : (
                      <div className="space-y-2">
                        {meal.foods.map((food) => (
                          <div key={food.localId} className="rounded-lg border border-border/60 p-3 space-y-2 bg-background/40">
                            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] gap-2">
                              <Input
                                value={food.foodName}
                                onChange={(event) => updateFood(meal.localId, food.localId, { foodName: event.target.value })}
                                placeholder={t.nutrition.foodName}
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={food.quantity}
                                onChange={(event) => updateFood(meal.localId, food.localId, { quantity: event.target.value })}
                                placeholder={t.nutrition.quantity}
                              />
                              <Select
                                value={food.unit}
                                onValueChange={(value) => updateFood(meal.localId, food.localId, { unit: value as NutritionUnit })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIT_OPTIONS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unitLabel(unit)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={food.calories}
                                onChange={(event) => updateFood(meal.localId, food.localId, { calories: event.target.value })}
                                placeholder={t.nutrition.calories}
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={food.protein}
                                onChange={(event) => updateFood(meal.localId, food.localId, { protein: event.target.value })}
                                placeholder={t.nutrition.protein}
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={food.carbs}
                                onChange={(event) => updateFood(meal.localId, food.localId, { carbs: event.target.value })}
                                placeholder={t.nutrition.carbs}
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={food.fat}
                                  onChange={(event) => updateFood(meal.localId, food.localId, { fat: event.target.value })}
                                  placeholder={t.nutrition.fat}
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => removeFood(meal.localId, food.localId)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Input
                              value={food.notes}
                              onChange={(event) => updateFood(meal.localId, food.localId, { notes: event.target.value })}
                              placeholder={t.nutrition.notes}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t.nutrition.calories}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <MacroStat label={t.nutrition.calories} value={totals.calories} className="text-red-400" />
                  <MacroStat label={t.nutrition.protein} value={totals.protein} className="text-blue-400" />
                  <MacroStat label={t.nutrition.carbs} value={totals.carbs} className="text-orange-400" />
                  <MacroStat label={t.nutrition.fat} value={totals.fat} className="text-yellow-300" />
                </div>
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
                      <Pie
                        data={macroChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={3}
                      >
                        {macroChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {macroChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}: {entry.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function MacroStat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-md border border-border/70 p-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`text-lg font-bold ${className}`}>{Number(value.toFixed(1))}</div>
    </div>
  );
}
