import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExerciseDisplayCard from "@/components/exercises/ExerciseDisplayCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, Dumbbell, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CATEGORIES = ["chest", "back", "shoulders", "arms", "legs", "abs", "cardio", "full_body", "rest"];
const GOALS = ["weight_loss", "muscle_gain", "fitness", "rehab", "other"];
const GOAL_LABELS = {
  en: {
    weight_loss: "Weight Loss",
    muscle_gain: "Muscle Gain",
    fitness: "Fitness",
    rehab: "Rehab",
    other: "Other",
  },
  ar: {
    weight_loss: "خسارة الوزن",
    muscle_gain: "زيادة العضلات",
    fitness: "لياقة",
    rehab: "تأهيل",
    other: "أخرى",
  },
} as const;

const CATEGORY_LABELS = {
  en: {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    arms: "Arms",
    legs: "Legs",
    abs: "Abs",
    cardio: "Cardio",
    full_body: "Full Body",
    rest: "Rest",
  },
  ar: {
    chest: "صدر",
    back: "ظهر",
    shoulders: "أكتاف",
    arms: "ذراع",
    legs: "أرجل",
    abs: "بطن",
    cardio: "كارديو",
    full_body: "كامل الجسم",
    rest: "راحة",
  },
} as const;

const UI_TEXT = {
  en: {
    plans: "Plans",
    new: "New",
    noPlans: "No plans yet",
    selectPlanHint: "Create or select a plan, then add a day, then add an exercise and click Import.",
    addDay: "Add Day",
    noDays: 'No days added yet. Click "Add Day" to start.',
    deleteDayConfirm: "Delete this day?",
    createPlan: "Create Workout Plan",
    planName: "Plan Name",
    planNamePlaceholder: "e.g. Beginner Weight Loss",
    goal: "Goal",
    selectGoal: "Select goal",
    description: "Description",
    cancel: "Cancel",
    create: "Create",
    addWorkoutDay: "Add Workout Day",
    dayName: "Day Name",
    dayNamePlaceholder: "e.g. Monday - Chest",
    category: "Category",
    selectCategory: "Select category",
    order: "Order",
    addExercise: "Add Exercise",
    exerciseNameRequired: "Exercise name is required",
    exerciseName: "Exercise Name",
    import: "Import",
    exerciseNamePlaceholder: "e.g. Bench Press",
    howToPerform: "How to perform",
    sets: "Sets",
    reps: "Reps",
    restSec: "Rest (sec)",
    demoUrl: "Demo URL",
    demoUrlPlaceholder: "https://www.youtube.com/watch?v=...",
    notes: "Notes",
    notesPlaceholder: "e.g. Keep back straight",
    instructions: "Instructions",
    instructionsPlaceholder: "One instruction per line",
    exerciseLibrary: "Exercise Library",
    searchExercise: "Search exercise",
    searchExercisePlaceholder: "e.g. squat, bench press, deadlift",
    bodyPart: "Body Part",
    allBodyParts: "All body parts",
    targetMuscle: "Target Muscle",
    allTargets: "All targets",
    searchHint: "Type 2+ letters or choose a filter.",
    noExercisesFound: "No exercises found.",
    noPreview: "No Preview",
    equipment: "Equipment",
    videoSuggestionsFor: (name: string) => `Video suggestions for "${name}"`,
    noVideos: "No videos found.",
    useVideo: "Use Video",
    demoUrlAdded: "Demo URL added",
    close: "Close",
    exercise: "Exercise",
    noExercisesYet: "No exercises yet. Add the first one.",
    demoVideo: "Demo video",
    exerciseAdded: "Exercise added",
    exerciseDeleted: "Exercise deleted",
    planCreated: "Plan created",
    dayAdded: "Day added",
    dayDeleted: "Day deleted",
    target: "Target",
    bodyPartLabel: "Body Part",
    secondsShort: "s",
    exercisePreviewAlt: "Exercise preview",
  },
  ar: {
    plans: "الخطط",
    new: "جديد",
    noPlans: "لا توجد خطط بعد",
    selectPlanHint: "أنشئ أو اختر خطة، ثم أضف يومًا، ثم أضف تمرينًا واضغط استيراد.",
    addDay: "إضافة يوم",
    noDays: "لا توجد أيام بعد. اضغط إضافة يوم للبدء.",
    deleteDayConfirm: "حذف هذا اليوم؟",
    createPlan: "إنشاء خطة تمرين",
    planName: "اسم الخطة",
    planNamePlaceholder: "مثال: مبتدئ لخسارة الوزن",
    goal: "الهدف",
    selectGoal: "اختر الهدف",
    description: "الوصف",
    cancel: "إلغاء",
    create: "إنشاء",
    addWorkoutDay: "إضافة يوم تمرين",
    dayName: "اسم اليوم",
    dayNamePlaceholder: "مثال: الاثنين - صدر",
    category: "الفئة",
    selectCategory: "اختر الفئة",
    order: "الترتيب",
    addExercise: "إضافة تمرين",
    exerciseNameRequired: "اسم التمرين مطلوب",
    exerciseName: "اسم التمرين",
    import: "استيراد",
    exerciseNamePlaceholder: "مثال: بنش برس",
    howToPerform: "طريقة الأداء",
    sets: "الجولات",
    reps: "التكرارات",
    restSec: "الراحة (ث)",
    demoUrl: "رابط الفيديو",
    demoUrlPlaceholder: "https://www.youtube.com/watch?v=...",
    notes: "ملاحظات",
    notesPlaceholder: "مثال: حافظ على استقامة الظهر",
    instructions: "خطوات التمرين",
    instructionsPlaceholder: "ضع كل خطوة في سطر",
    exerciseLibrary: "مكتبة التمارين",
    searchExercise: "بحث عن تمرين",
    searchExercisePlaceholder: "مثال: سكوات، بنش برس، ديدلفت",
    bodyPart: "جزء الجسم",
    allBodyParts: "كل أجزاء الجسم",
    targetMuscle: "العضلة المستهدفة",
    allTargets: "كل العضلات",
    searchHint: "اكتب حرفين على الأقل أو اختر فلتر.",
    noExercisesFound: "لا توجد تمارين.",
    noPreview: "لا توجد معاينة",
    equipment: "المعدة",
    videoSuggestionsFor: (name: string) => `اقتراحات فيديو لـ "${name}"`,
    noVideos: "لا توجد فيديوهات.",
    useVideo: "استخدام الفيديو",
    demoUrlAdded: "تمت إضافة رابط الفيديو",
    close: "إغلاق",
    exercise: "تمرين",
    noExercisesYet: "لا توجد تمارين بعد. أضف أول تمرين.",
    demoVideo: "فيديو توضيحي",
    exerciseAdded: "تمت إضافة التمرين",
    exerciseDeleted: "تم حذف التمرين",
    planCreated: "تم إنشاء الخطة",
    dayAdded: "تمت إضافة اليوم",
    dayDeleted: "تم حذف اليوم",
    target: "العضلة",
    bodyPartLabel: "جزء الجسم",
    secondsShort: "ث",
    exercisePreviewAlt: "معاينة التمرين",
  },
} as const;

const getLocalizedGoalLabel = (goal: string, language: "en" | "ar") =>
  GOAL_LABELS[language][goal as keyof (typeof GOAL_LABELS)["en"]] ?? goal.replace("_", " ");

const getLocalizedCategoryLabel = (category: string, language: "en" | "ar") =>
  CATEGORY_LABELS[language][category as keyof (typeof CATEGORY_LABELS)["en"]] ?? category.replace("_", " ");

const FITNESS_TERMS_AR: Record<string, string> = {
  quads: "عضلات الفخذ الأمامية",
  hamstrings: "العضلات الخلفية للفخذ",
  calves: "السمانة",
  glutes: "الألوية",
  abs: "البطن",
  chest: "الصدر",
  back: "الظهر",
  shoulders: "الأكتاف",
  biceps: "البايسبس",
  triceps: "الترايسبس",
  forearms: "الساعد",
  "upper arms": "الذراع العلوية",
  "upper legs": "الفخذ",
  "lower legs": "الساق",
  "body weight": "وزن الجسم",
  barbell: "باربل",
  dumbbell: "دمبل",
  kettlebell: "كيتلبيل",
  cable: "كيبل",
  machine: "آلة",
  band: "حبل مقاومة",
  bands: "أحبال مقاومة",
  cardio: "كارديو",
};

const DAYS_AR: Record<string, string> = {
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
  sunday: "الأحد",
};

const formatExerciseTag = (value?: string, language: "en" | "ar" = "en") => {
  const normalized = (value ?? "").replace(/[_-]/g, " ").trim();
  if (!normalized) return "";
  if (language === "ar") {
    const translated = FITNESS_TERMS_AR[normalized.toLowerCase()];
    if (translated) return translated;
    return normalized;
  }
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const localizeDayName = (value: string, language: "en" | "ar") => {
  if (language !== "ar") return value;
  let out = value;
  for (const [enDay, arDay] of Object.entries(DAYS_AR)) {
    out = out.replace(new RegExp(enDay, "gi"), arDay);
  }
  for (const category of CATEGORIES) {
    out = out.replace(new RegExp(category.replace("_", "[ _-]?"), "gi"), getLocalizedCategoryLabel(category, "ar"));
  }
  return out;
};

const localizeExerciseNotes = (value: string | undefined, language: "en" | "ar") => {
  if (!value || language !== "ar") return value;
  let out = value
    .replace(/Target:/gi, "العضلة:")
    .replace(/Equipment:/gi, "المعدة:")
    .replace(/Body Part:/gi, "جزء الجسم:");
  for (const [enTerm, arTerm] of Object.entries(FITNESS_TERMS_AR)) {
    out = out.replace(new RegExp(`\\b${enTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), arTerm);
  }
  return out;
};

const ARABIC_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bassisted\b/gi, "مساعد"],
  [/\bstanding\b/gi, "وقوف"],
  [/\bkneeling\b/gi, "ركوع"],
  [/\balternating\b/gi, "بالتناوب"],
  [/\bextension\b/gi, "تمديد"],
  [/\bpress\b/gi, "ضغط"],
  [/\bsquat\b/gi, "سكوات"],
  [/\bcurl\b/gi, "كورل"],
  [/\bwith\b/gi, "مع"],
  [/\band\b/gi, "و"],
  [/\bstart\b/gi, "ابدأ"],
  [/\bkeep\b/gi, "حافظ"],
  [/\bhold\b/gi, "امسك"],
];

const localizeExerciseText = (value: string | undefined, language: "en" | "ar") => {
  if (!value || language !== "ar") return value;
  let out = value.replace(/[_-]/g, " ");
  for (const [enTerm, arTerm] of Object.entries(FITNESS_TERMS_AR).sort((a, b) => b[0].length - a[0].length)) {
    out = out.replace(new RegExp(`\\b${enTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), arTerm);
  }
  for (const [pattern, replacement] of ARABIC_TEXT_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
};

const getYoutubeVideoId = (url?: string) => {
  if (!url) return undefined;
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1];
};

const getExercisePreviewUrl = (exercise: { gifUrl?: string | null; demoUrl?: string | null }) => {
  if (exercise.gifUrl) return exercise.gifUrl;
  if (exercise.demoUrl && /\.(mp4|webm|ogg)(\?|#|$)/i.test(exercise.demoUrl)) {
    return exercise.demoUrl;
  }
  const videoId = getYoutubeVideoId(exercise.demoUrl ?? undefined);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
};

export default function AdminWorkouts() {
  const { t, language } = useLanguage();
  const ui = language === "ar" ? UI_TEXT.ar : UI_TEXT.en;
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [planGoal, setPlanGoal] = useState<string>("");
  const [dayCategory, setDayCategory] = useState<string>("chest");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSets, setExerciseSets] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");
  const [exerciseRestTime, setExerciseRestTime] = useState("");
  const [exerciseInstructions, setExerciseInstructions] = useState<string[]>([]);
  const [exerciseInstructionsText, setExerciseInstructionsText] = useState("");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [exerciseDemoUrl, setExerciseDemoUrl] = useState("");
  const [exerciseGifUrl, setExerciseGifUrl] = useState("");
  const [exerciseBodyPart, setExerciseBodyPart] = useState("");
  const [exerciseTarget, setExerciseTarget] = useState("");
  const [exerciseEquipment, setExerciseEquipment] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryBodyPartFilter, setLibraryBodyPartFilter] = useState("all");
  const [libraryTargetFilter, setLibraryTargetFilter] = useState("all");
  const [debouncedLibraryQuery, setDebouncedLibraryQuery] = useState("");
  const [selectedLibraryExerciseName, setSelectedLibraryExerciseName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLibraryQuery(libraryQuery), 450);
    return () => clearTimeout(timer);
  }, [libraryQuery]);

  const plansQuery = trpc.workouts.list.useQuery({ isArchived: false });
  const daysQuery = trpc.workouts.getDays.useQuery({ planId: selectedPlan! }, { enabled: !!selectedPlan });
  const libraryFiltersQuery = trpc.workouts.libraryFilters.useQuery(undefined, { enabled: showExerciseLibrary });
  const canSearchLibrary =
    debouncedLibraryQuery.trim().length >= 2 || libraryBodyPartFilter !== "all" || libraryTargetFilter !== "all";
  const librarySearchQuery = trpc.workouts.librarySearch.useQuery(
    {
      query: debouncedLibraryQuery.trim() || undefined,
      bodyPart: libraryBodyPartFilter !== "all" ? libraryBodyPartFilter : undefined,
      target: libraryTargetFilter !== "all" ? libraryTargetFilter : undefined,
      limit: 24,
    },
    { enabled: showExerciseLibrary && canSearchLibrary, retry: false, staleTime: 1000 * 60 * 10 }
  );
  const libraryVideosQuery = trpc.workouts.libraryVideos.useQuery(
    { query: `${selectedLibraryExerciseName} exercise`, limit: 6 },
    { enabled: showExerciseLibrary && selectedLibraryExerciseName.trim().length > 0, retry: false }
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!showExerciseLibrary || !selectedLibraryExerciseName || exerciseDemoUrl) return;
    const firstVideo = libraryVideosQuery.data?.[0];
    if (firstVideo?.url) {
      setExerciseDemoUrl(firstVideo.url);
    }
  }, [showExerciseLibrary, selectedLibraryExerciseName, exerciseDemoUrl, libraryVideosQuery.data]);

  const createPlanMutation = trpc.workouts.create.useMutation({
    onSuccess: () => { utils.workouts.list.invalidate(); setShowAddPlan(false); toast.success(ui.planCreated); },
    onError: (e) => toast.error(e.message),
  });
  const addDayMutation = trpc.workouts.addDay.useMutation({
    onSuccess: () => { utils.workouts.getDays.invalidate(); setShowAddDay(false); toast.success(ui.dayAdded); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDayMutation = trpc.workouts.deleteDay.useMutation({
    onSuccess: () => { utils.workouts.getDays.invalidate(); toast.success(ui.dayDeleted); },
    onError: (e) => toast.error(e.message),
  });
  const addExerciseMutation = trpc.workouts.addExercise.useMutation({
    onSuccess: () => {
      utils.workouts.getExercises.invalidate();
      setShowAddExercise(false);
      setShowExerciseLibrary(false);
      setExerciseName("");
      setExerciseSets("");
      setExerciseReps("");
      setExerciseRestTime("");
      setExerciseInstructions([]);
      setExerciseInstructionsText("");
      setExerciseNotes("");
      setExerciseDemoUrl("");
      setExerciseGifUrl("");
      setExerciseBodyPart("");
      setExerciseTarget("");
      setExerciseEquipment("");
      setLibraryQuery("");
      setLibraryBodyPartFilter("all");
      setLibraryTargetFilter("all");
      setSelectedLibraryExerciseName("");
      toast.success(ui.exerciseAdded);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteExerciseMutation = trpc.workouts.deleteExercise.useMutation({
    onSuccess: () => { utils.workouts.getExercises.invalidate(); toast.success(ui.exerciseDeleted); },
    onError: (e) => toast.error(e.message),
  });

  const plans = plansQuery.data ?? [];
  const days = daysQuery.data ?? [];
  const activePlan = plans.find((p) => p.id === selectedPlan);
  const addExercisePreviewUrl = getExercisePreviewUrl({
    gifUrl: exerciseGifUrl,
    demoUrl: exerciseDemoUrl,
  });

  useEffect(() => {
    if (!selectedPlan && plans.length > 0) {
      setSelectedPlan(plans[0].id);
    }
  }, [plans, selectedPlan]);

  const toggleDay = (dayId: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };

  const applyCatalogExercise = (exercise: {
    name: string;
    target: string;
    equipment: string;
    bodyPart: string;
    gifUrl?: string;
    description?: string;
    instructions?: string[];
  }) => {
    setExerciseName(exercise.name);
    if (!exerciseSets) setExerciseSets("3");
    if (!exerciseReps) setExerciseReps("10-12");
    if (!exerciseRestTime) setExerciseRestTime("60");
    const instructionText = exercise.instructions?.slice(0, 2).join(" ");
    const notes = [
      `${ui.target}: ${formatExerciseTag(exercise.target, language)}`,
      `${ui.equipment}: ${formatExerciseTag(exercise.equipment, language)}`,
      `${ui.bodyPartLabel}: ${formatExerciseTag(exercise.bodyPart, language)}`,
      exercise.description,
      instructionText,
    ]
      .filter(Boolean)
      .join(" | ");
    setExerciseNotes(notes);
    const instructions = exercise.instructions?.slice(0, 8) ?? [];
    setExerciseInstructions(instructions);
    setExerciseInstructionsText(instructions.join("\n"));
    setSelectedLibraryExerciseName(exercise.name);
    setExerciseGifUrl(exercise.gifUrl ?? "");
    setExerciseBodyPart(exercise.bodyPart ?? "");
    setExerciseTarget(exercise.target ?? "");
    setExerciseEquipment(exercise.equipment ?? "");
  };

  return (
    <AdminLayout title={t.workouts.title}>
      <div className="flex gap-6">
        {/* Plans List */}
        <div className="w-72 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">{ui.plans}</h2>
            <Button size="sm" onClick={() => setShowAddPlan(true)} className="gap-1"><Plus className="w-3 h-3" />{ui.new}</Button>
          </div>
          <div className="space-y-2">
            {plansQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{ui.noPlans}</div>
            ) : (
              plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan.id); setSelectedDay(null); }}
                  className={`w-full text-start p-3 rounded-lg border transition-all ${selectedPlan === plan.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground text-sm">{plan.name}</span>
                  </div>
                  {plan.goal && <Badge variant="secondary" className="text-xs">{getLocalizedGoalLabel(plan.goal, language)}</Badge>}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Plan Detail */}
        <div className="flex-1 min-w-0">
          {!selectedPlan ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-center">
              {ui.selectPlanHint}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{activePlan?.name}</h2>
                  {activePlan?.description && <p className="text-sm text-muted-foreground">{activePlan.description}</p>}
                </div>
                <Button size="sm" onClick={() => setShowAddDay(true)} className="gap-1"><Plus className="w-3 h-3" />{ui.addDay}</Button>
              </div>

              <div className="space-y-3">
                {days.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="p-8 text-center space-y-3">
                      <p className="text-muted-foreground">{ui.noDays}</p>
                      <Button size="sm" onClick={() => setShowAddDay(true)} className="gap-1">
                        <Plus className="w-3 h-3" />
                        {ui.addDay}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  days.map((day) => (
                    <WorkoutDayCard
                      key={day.id}
                      day={day}
                      language={language}
                      ui={ui}
                      isExpanded={expandedDays.has(day.id)}
                      onToggle={() => toggleDay(day.id)}
                      onDelete={() => { if (confirm(ui.deleteDayConfirm)) deleteDayMutation.mutate({ id: day.id }); }}
                      onAddExercise={() => {
                        setSelectedDay(day.id);
                        setExerciseName("");
                        setExerciseSets("");
                        setExerciseReps("");
                        setExerciseRestTime("");
                        setExerciseInstructions([]);
                        setExerciseInstructionsText("");
                        setExerciseNotes("");
                        setExerciseDemoUrl("");
                        setExerciseGifUrl("");
                        setExerciseBodyPart("");
                        setExerciseTarget("");
                        setExerciseEquipment("");
                        setLibraryQuery("");
                        setLibraryBodyPartFilter("all");
                        setLibraryTargetFilter("all");
                        setSelectedLibraryExerciseName("");
                        setShowAddExercise(true);
                      }}
                      onDeleteExercise={(exId) => deleteExerciseMutation.mutate({ id: exId })}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Plan Dialog */}
      <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{ui.createPlan}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createPlanMutation.mutate({ name: fd.get("name") as string, goal: (planGoal || undefined) as any, description: fd.get("description") as string || undefined }); }} className="space-y-4">
            <div className="space-y-1.5"><Label>{ui.planName} *</Label><Input name="name" required placeholder={ui.planNamePlaceholder} /></div>
            <div className="space-y-1.5"><Label>{ui.goal}</Label>
              <Select value={planGoal} onValueChange={setPlanGoal}><SelectTrigger><SelectValue placeholder={ui.selectGoal} /></SelectTrigger>
                <SelectContent>{GOALS.map(g => <SelectItem key={g} value={g}>{getLocalizedGoalLabel(g, language)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{ui.description}</Label><Input name="description" /></div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddPlan(false)}>{ui.cancel}</Button><Button type="submit" className="flex-1">{ui.create}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Day Dialog */}
      <Dialog open={showAddDay} onOpenChange={setShowAddDay}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{ui.addWorkoutDay}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addDayMutation.mutate({ planId: selectedPlan!, dayName: fd.get("dayName") as string, category: dayCategory as any, dayOrder: Number(fd.get("dayOrder")) || 0 }); }} className="space-y-4">
            <div className="space-y-1.5"><Label>{ui.dayName} *</Label><Input name="dayName" required placeholder={ui.dayNamePlaceholder} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{ui.category} *</Label>
                <Select value={dayCategory} onValueChange={setDayCategory}><SelectTrigger><SelectValue placeholder={ui.selectCategory} /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{getLocalizedCategoryLabel(c, language)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{ui.order}</Label><Input name="dayOrder" type="number" placeholder="1" /></div>
            </div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddDay(false)}>{ui.cancel}</Button><Button type="submit" className="flex-1">{ui.addDay}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{ui.addExercise}</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedDay) return;
              if (!exerciseName.trim()) {
                toast.error(ui.exerciseNameRequired);
                return;
              }
              addExerciseMutation.mutate({
                dayId: selectedDay,
                name: exerciseName.trim(),
                sets: exerciseSets ? Number(exerciseSets) : undefined,
                reps: exerciseReps || undefined,
                restTime: exerciseRestTime || undefined,
                instructions: exerciseInstructions.length > 0 ? exerciseInstructions : undefined,
                notes: exerciseNotes || undefined,
                demoUrl: exerciseDemoUrl || undefined,
                gifUrl: exerciseGifUrl || undefined,
                bodyPart: exerciseBodyPart || undefined,
                target: exerciseTarget || undefined,
                equipment: exerciseEquipment || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{ui.exerciseName} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowExerciseLibrary(true)}
                >
                  <Search className="w-3 h-3" />
                  {ui.import}
                </Button>
              </div>
              <Input
                name="name"
                required
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder={ui.exerciseNamePlaceholder}
              />
              {(exerciseBodyPart || exerciseTarget || exerciseEquipment) && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {exerciseBodyPart && <Badge variant="secondary">{formatExerciseTag(exerciseBodyPart, language)}</Badge>}
                  {exerciseTarget && <Badge variant="secondary">{formatExerciseTag(exerciseTarget, language)}</Badge>}
                  {exerciseEquipment && <Badge variant="secondary">{formatExerciseTag(exerciseEquipment, language)}</Badge>}
                </div>
              )}
              {addExercisePreviewUrl && (
                <img
                  src={addExercisePreviewUrl}
                  alt={exerciseName || ui.exercisePreviewAlt}
                  className="w-full h-44 object-contain rounded border border-border bg-white mt-2"
                  loading="lazy"
                />
              )}
              {exerciseInstructions.length > 0 && (
                <div className="mt-2 rounded border border-border bg-secondary/20 p-2">
                  <p className="text-xs font-medium text-foreground mb-1">{ui.howToPerform}</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    {exerciseInstructions.slice(0, 3).map((step, idx) => (
                      <li key={`${idx}-${step.slice(0, 12)}`}>{localizeExerciseText(step, language)}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>{ui.sets}</Label><Input name="sets" type="number" placeholder="3" value={exerciseSets} onChange={(e) => setExerciseSets(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{ui.reps}</Label><Input name="reps" placeholder="8-12" value={exerciseReps} onChange={(e) => setExerciseReps(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{ui.restSec}</Label><Input name="restTime" placeholder="60" value={exerciseRestTime} onChange={(e) => setExerciseRestTime(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>{ui.demoUrl}</Label><Input name="demoUrl" placeholder={ui.demoUrlPlaceholder} value={exerciseDemoUrl} onChange={(e) => setExerciseDemoUrl(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{ui.notes}</Label><Input name="notes" placeholder={ui.notesPlaceholder} value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>{ui.instructions}</Label>
              <Textarea
                rows={4}
                value={exerciseInstructionsText}
                placeholder={ui.instructionsPlaceholder}
                onChange={(event) => {
                  const value = event.target.value;
                  setExerciseInstructionsText(value);
                  setExerciseInstructions(
                    value
                      .split(/\r?\n/)
                      .map((step) => step.trim())
                      .filter(Boolean)
                  );
                }}
              />
            </div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddExercise(false)}>{ui.cancel}</Button><Button type="submit" className="flex-1">{ui.addExercise}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exercise Library Dialog */}
      <Dialog open={showExerciseLibrary} onOpenChange={setShowExerciseLibrary}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <DialogHeader><DialogTitle>{ui.exerciseLibrary}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{ui.searchExercise}</Label>
              <Input
                placeholder={ui.searchExercisePlaceholder}
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{ui.bodyPart}</Label>
                <Select value={libraryBodyPartFilter} onValueChange={setLibraryBodyPartFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ui.allBodyParts}</SelectItem>
                    {(libraryFiltersQuery.data?.bodyParts ?? []).map((bodyPart) => (
                      <SelectItem key={bodyPart} value={bodyPart}>{formatExerciseTag(bodyPart, language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{ui.targetMuscle}</Label>
                <Select value={libraryTargetFilter} onValueChange={setLibraryTargetFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ui.allTargets}</SelectItem>
                    {(libraryFiltersQuery.data?.targets ?? []).map((target) => (
                      <SelectItem key={target} value={target}>{formatExerciseTag(target, language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {librarySearchQuery.error && (
              <p className="text-sm text-destructive">{librarySearchQuery.error.message}</p>
            )}

            <div className="max-h-[28rem] overflow-y-auto">
              {librarySearchQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-56 bg-secondary/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (librarySearchQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {!canSearchLibrary ? ui.searchHint : ui.noExercisesFound}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(librarySearchQuery.data ?? []).map((exercise) => (
                    <ExerciseDisplayCard
                      key={exercise.id}
                      className="hover:shadow-xl"
                      onClick={() => applyCatalogExercise(exercise)}
                      name={localizeExerciseText(exercise.name, language) ?? exercise.name}
                      bodyPart={exercise.bodyPart ? formatExerciseTag(exercise.bodyPart, language) : undefined}
                      target={exercise.target ? formatExerciseTag(exercise.target, language) : undefined}
                      imageUrl={exercise.gifUrl}
                      noPreviewLabel={ui.noPreview}
                      footer={(
                        <>
                          {exercise.equipment ? (
                            <div className="text-xs text-slate-500">
                              {ui.equipment}: {formatExerciseTag(exercise.equipment, language)}
                            </div>
                          ) : null}
                          {exercise.instructions?.[0] ? (
                            <div className="text-xs text-slate-500 line-clamp-2">
                              {localizeExerciseText(exercise.instructions[0], language)}
                            </div>
                          ) : null}
                        </>
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {selectedLibraryExerciseName && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  {ui.videoSuggestionsFor(localizeExerciseText(selectedLibraryExerciseName, language) ?? selectedLibraryExerciseName)}
                </div>
                {libraryVideosQuery.isLoading ? (
                  <div className="h-16 bg-secondary/30 rounded animate-pulse" />
                ) : (libraryVideosQuery.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{ui.noVideos}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(libraryVideosQuery.data ?? []).map((video) => (
                      <div
                        key={video.videoId}
                        className="p-2 rounded border border-border flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-foreground truncate">{video.title}</div>
                          {video.channelName && (
                            <div className="text-xs text-muted-foreground truncate">{video.channelName}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setExerciseDemoUrl(video.url);
                            toast.success(ui.demoUrlAdded);
                          }}
                        >
                          {ui.useVideo}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowExerciseLibrary(false)}>{ui.close}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function WorkoutDayCard({ day, isExpanded, onToggle, onDelete, onAddExercise, onDeleteExercise, language, ui }: {
  day: any;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onDeleteExercise: (id: number) => void;
  language: "en" | "ar";
  ui: (typeof UI_TEXT)["en"] | (typeof UI_TEXT)["ar"];
}) {
  const exercisesQuery = trpc.workouts.getExercises.useQuery({ dayId: day.id }, { enabled: isExpanded });
  const exercises = exercisesQuery.data ?? [];

  const CATEGORY_COLORS: Record<string, string> = {
    chest: "bg-red-500/20 text-red-400", back: "bg-blue-500/20 text-blue-400",
    shoulders: "bg-yellow-500/20 text-yellow-400", arms: "bg-purple-500/20 text-purple-400",
    legs: "bg-green-500/20 text-green-400", abs: "bg-orange-500/20 text-orange-400",
    cardio: "bg-cyan-500/20 text-cyan-400", full_body: "bg-primary/20 text-primary",
    rest: "bg-gray-500/20 text-gray-400",
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-start">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className="font-medium text-foreground">{localizeDayName(day.dayName, language)}</span>
            <Badge className={`text-xs ${CATEGORY_COLORS[day.category] ?? "bg-gray-500/20 text-gray-400"}`}>
              {getLocalizedCategoryLabel(day.category, language)}
            </Badge>
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onAddExercise} className="gap-1 text-xs"><Plus className="w-3 h-3" />{ui.exercise}</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4 pt-3">
          {exercisesQuery.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-secondary/30 rounded animate-pulse" />)}</div>
          ) : exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{ui.noExercisesYet}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {exercises.map((ex: any) => (
                <div key={ex.id} className="relative">
                  <ExerciseDisplayCard
                    name={localizeExerciseText(ex.name, language) ?? ex.name}
                    bodyPart={ex.bodyPart ? formatExerciseTag(ex.bodyPart, language) : undefined}
                    target={ex.target ? formatExerciseTag(ex.target, language) : undefined}
                    imageUrl={getExercisePreviewUrl(ex)}
                    noPreviewLabel={ui.noPreview}
                    footer={(
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div>
                          {ex.sets && `${ex.sets} ${ui.sets}`}{ex.reps && ` x ${ex.reps}`}{ex.restTime && ` - ${ex.restTime}${ui.secondsShort}`}
                        </div>
                        {ex.demoUrl ? (
                          <a
                            href={ex.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary inline-flex items-center gap-1"
                          >
                            {ui.demoVideo}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}
                        {ex.notes ? (
                          <div className="line-clamp-3">
                            {localizeExerciseNotes(ex.notes, language)}
                          </div>
                        ) : null}
                        {Array.isArray(ex.instructions) && ex.instructions.length > 0 ? (
                          <ol className="list-decimal list-inside space-y-0.5">
                            {ex.instructions.slice(0, 2).map((step: string, idx: number) => (
                              <li key={`${ex.id}-step-${idx}`}>{localizeExerciseText(step, language)}</li>
                            ))}
                          </ol>
                        ) : null}
                      </div>
                    )}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 start-2 w-8 h-8 text-destructive hover:text-destructive bg-white/90"
                    onClick={() => onDeleteExercise(ex.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
