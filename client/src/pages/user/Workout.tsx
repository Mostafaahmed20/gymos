import UserLayout from "@/components/UserLayout";
import ExerciseDisplayCard from "@/components/exercises/ExerciseDisplayCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Dumbbell, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  chest: "bg-red-500/20 text-red-400", back: "bg-blue-500/20 text-blue-400",
  shoulders: "bg-yellow-500/20 text-yellow-400", arms: "bg-purple-500/20 text-purple-400",
  legs: "bg-green-500/20 text-green-400", abs: "bg-orange-500/20 text-orange-400",
  cardio: "bg-cyan-500/20 text-cyan-400", full_body: "bg-primary/20 text-primary",
  rest: "bg-gray-500/20 text-gray-400",
};
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

const formatExerciseTag = (value: string | undefined, language: "en" | "ar") => {
  const cleaned = (value ?? "").replace(/[_-]/g, " ").trim();
  if (!cleaned) return "";
  if (language === "ar") return FITNESS_TERMS_AR[cleaned.toLowerCase()] ?? cleaned;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

const localizeCategory = (category: string, language: "en" | "ar") =>
  CATEGORY_LABELS[language][category as keyof (typeof CATEGORY_LABELS)["en"]] ?? category.replace("_", " ");

const localizeGoal = (goal: string, language: "en" | "ar") =>
  GOAL_LABELS[language][goal as keyof (typeof GOAL_LABELS)["en"]] ?? goal.replace("_", " ");

const localizeDayName = (value: string, language: "en" | "ar") => {
  if (language !== "ar") return value;
  let out = value;
  for (const [enDay, arDay] of Object.entries(DAYS_AR)) {
    out = out.replace(new RegExp(enDay, "gi"), arDay);
  }
  for (const [categoryEn, categoryAr] of Object.entries(CATEGORY_LABELS.ar)) {
    out = out.replace(new RegExp(categoryEn.replace("_", "[ _-]?"), "gi"), categoryAr);
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

export default function UserWorkout() {
  const { t, language } = useLanguage();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const workoutQuery = trpc.userPortal.workoutPlan.useQuery();

  const data = workoutQuery.data;
  const days = data?.days ?? [];
  const plan = data?.plan;

  const dayOfWeek = new Date().getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return (
    <UserLayout title={t.userWorkout.title}>
      {workoutQuery.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : !plan ? (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">{t.userWorkout.noWorkout}</h3>
          <p className="text-muted-foreground">{t.userWorkout.contactAdmin}</p>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{plan.name}</h2>
                {plan.goal && <Badge variant="secondary" className="text-xs mt-0.5">{localizeGoal(plan.goal, language)}</Badge>}
              </div>
            </div>
            {plan.description && <p className="text-sm text-muted-foreground mt-3">{plan.description}</p>}
          </div>

          <div className="space-y-3">
            {days.map((day, index) => {
              const isToday = index === todayIndex % days.length;
              const isExpanded = expandedDay === day.id;
              return (
                <Card key={day.id} className={`bg-card border-border transition-all ${isToday ? "border-primary/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "hover:border-primary/30"}`}>
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <button onClick={() => setExpandedDay(isExpanded ? null : day.id)} className="flex items-center gap-3 flex-1 text-start">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{localizeDayName(day.dayName, language)}</span>
                            {isToday && <Badge className="bg-primary/20 text-primary text-xs">{t.userWorkout.todayWorkout}</Badge>}
                          </div>
                          <Badge className={`text-xs mt-1 ${CATEGORY_COLORS[day.category] ?? "bg-gray-500/20 text-gray-400"}`}>{localizeCategory(day.category, language)}</Badge>
                        </div>
                      </button>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="p-4 pt-3">
                      <ExerciseList dayId={day.id} language={language} />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </UserLayout>
  );
}

function ExerciseList({ dayId, language }: { dayId: number; language: "en" | "ar" }) {
  const { t } = useLanguage();
  const exercisesQuery = trpc.userPortal.workoutDayExercises.useQuery({ dayId });
  const exercises = exercisesQuery.data ?? [];

  if (exercisesQuery.isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />)}</div>;
  if (exercises.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">{t.userWorkout.noExercises}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {exercises.map((ex) => (
        <ExerciseDisplayCard
          key={ex.id}
          name={localizeExerciseText(ex.name, language) ?? ex.name}
          bodyPart={ex.bodyPart ? formatExerciseTag(ex.bodyPart, language) : undefined}
          target={ex.target ? formatExerciseTag(ex.target, language) : undefined}
          imageUrl={getExercisePreviewUrl(ex)}
          noPreviewLabel={language === "ar" ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u0627\u064a\u0646\u0629" : "No Preview"}
          footer={(
            <div className="space-y-1.5 text-xs text-slate-500">
              <div>
                {ex.sets && `${ex.sets} ${t.userWorkout.sets}`}{ex.reps && ` x ${ex.reps} ${t.userWorkout.reps}`}{ex.restTime && ` - ${ex.restTime}${t.userWorkout.sec} ${t.userWorkout.rest}`}
              </div>
              {ex.demoUrl ? (
                <a
                  href={ex.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1"
                >
                  {language === "ar" ? "\u0641\u064a\u062f\u064a\u0648 \u062a\u0648\u0636\u064a\u062d\u064a" : "Demo video"}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
              {ex.notes ? <div className="italic line-clamp-3">{localizeExerciseNotes(ex.notes, language)}</div> : null}
              {Array.isArray(ex.instructions) && ex.instructions.length > 0 ? (
                <ol className="list-decimal list-inside space-y-0.5">
                  {ex.instructions.slice(0, 3).map((step, idx) => (
                    <li key={`${ex.id}-step-${idx}`}>{localizeExerciseText(step, language)}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          )}
        />
      ))}
    </div>
  );
}
