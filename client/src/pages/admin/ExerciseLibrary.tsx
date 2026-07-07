import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExerciseDisplayCard from "@/components/exercises/ExerciseDisplayCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ExternalLink, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type ExerciseCard = {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  description?: string;
  difficulty?: string;
  category?: string;
  instructions?: string[];
};

const formatExerciseTag = (value?: string) =>
  (value ?? "").replace(/[_-]/g, " ").trim();

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

const localizeExerciseTag = (value: string | undefined, language: "en" | "ar") => {
  const cleaned = formatExerciseTag(value);
  if (!cleaned) return "";
  if (language === "ar") return FITNESS_TERMS_AR[cleaned.toLowerCase()] ?? cleaned;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
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

const UI_TEXT = {
  en: {
    title: "Exercise Library",
    search: "Search",
    searchPlaceholder: "Push up, squat, biceps...",
    bodyPart: "Body Part",
    targetMuscle: "Target Muscle",
    allBodyParts: "All body parts",
    allTargets: "All targets",
    searchHint: "Type 2+ letters or choose a filter to show exercises.",
    found: (count: number) => `${count} exercise(s) found`,
    goToWorkouts: "Go to Workout Plans",
    startSearch: "Start searching to view exercise cards.",
    noExercises: "No exercises found.",
    noPreview: "No Preview",
    equipment: "Equipment",
    exerciseFallback: "Exercise",
    howToPerform: "How to perform",
    videoSuggestions: "Video suggestions",
    noVideos: "No videos found.",
    open: "Open",
  },
  ar: {
    title: "مكتبة التمارين",
    search: "بحث",
    searchPlaceholder: "ضغط، سكوات، بايسبس...",
    bodyPart: "جزء الجسم",
    targetMuscle: "العضلة المستهدفة",
    allBodyParts: "كل أجزاء الجسم",
    allTargets: "كل العضلات",
    searchHint: "اكتب حرفين على الأقل أو اختر فلتر لعرض التمارين.",
    found: (count: number) => `تم العثور على ${count} تمرين`,
    goToWorkouts: "الذهاب إلى خطط التمرين",
    startSearch: "ابدأ البحث لعرض بطاقات التمارين.",
    noExercises: "لا توجد تمارين.",
    noPreview: "لا توجد معاينة",
    equipment: "المعدة",
    exerciseFallback: "تمرين",
    howToPerform: "طريقة الأداء",
    videoSuggestions: "اقتراحات فيديو",
    noVideos: "لا توجد فيديوهات.",
    open: "فتح",
  },
} as const;

export default function AdminExerciseLibrary() {
  const { language } = useLanguage();
  const ui = language === "ar" ? UI_TEXT.ar : UI_TEXT.en;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [bodyPartFilter, setBodyPartFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseCard | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const filtersQuery = trpc.workouts.libraryFilters.useQuery();
  const canSearch = debouncedQuery.trim().length >= 2 || bodyPartFilter !== "all" || targetFilter !== "all";
  const searchQuery = trpc.workouts.librarySearch.useQuery(
    {
      query: debouncedQuery.trim() || undefined,
      bodyPart: bodyPartFilter !== "all" ? bodyPartFilter : undefined,
      target: targetFilter !== "all" ? targetFilter : undefined,
      limit: 60,
    },
    { enabled: canSearch, staleTime: 1000 * 60 * 10, retry: false }
  );
  const videosQuery = trpc.workouts.libraryVideos.useQuery(
    { query: `${selectedExercise?.name ?? ""} exercise`, limit: 6 },
    { enabled: Boolean(selectedExercise) }
  );

  const cards = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const previewUrl = useMemo(() => {
    if (!selectedExercise) return undefined;
    if (selectedExercise.gifUrl) return selectedExercise.gifUrl;
    const firstVideo = videosQuery.data?.[0];
    const videoId = getYoutubeVideoId(firstVideo?.url);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
  }, [selectedExercise, videosQuery.data]);

  return (
    <AdminLayout title={ui.title}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-1 space-y-1.5">
            <Label>{ui.search}</Label>
            <Input
              placeholder={ui.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{ui.bodyPart}</Label>
            <Select value={bodyPartFilter} onValueChange={setBodyPartFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allBodyParts}</SelectItem>
                {(filtersQuery.data?.bodyParts ?? []).map((bodyPart) => (
                  <SelectItem key={bodyPart} value={bodyPart}>{localizeExerciseTag(bodyPart, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{ui.targetMuscle}</Label>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allTargets}</SelectItem>
                {(filtersQuery.data?.targets ?? []).map((target) => (
                  <SelectItem key={target} value={target}>{localizeExerciseTag(target, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {!canSearch ? ui.searchHint : ui.found(cards.length)}
          </p>
          <Link href="/admin/workouts">
            <Button variant="outline">{ui.goToWorkouts}</Button>
          </Link>
        </div>

        {!canSearch ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              {ui.startSearch}
            </CardContent>
          </Card>
        ) : searchQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-72 rounded-lg border border-border bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              {ui.noExercises}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map((exercise) => (
              <ExerciseDisplayCard
                key={exercise.id}
                className="hover:shadow-xl"
                onClick={() => setSelectedExercise(exercise)}
                name={localizeExerciseText(exercise.name, language) ?? exercise.name}
                bodyPart={localizeExerciseTag(exercise.bodyPart, language)}
                target={localizeExerciseTag(exercise.target, language)}
                imageUrl={exercise.gifUrl}
                noPreviewLabel={ui.noPreview}
                footer={(
                  <p className="text-xs text-slate-500">
                    {ui.equipment}: {localizeExerciseTag(exercise.equipment, language)}
                  </p>
                )}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedExercise)} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <DialogHeader>
            <DialogTitle>{localizeExerciseText(selectedExercise?.name, language) ?? ui.exerciseFallback}</DialogTitle>
          </DialogHeader>
          {selectedExercise && (
            <div className="space-y-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={selectedExercise.name}
                  className="w-full h-64 object-contain bg-white rounded border border-border"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{localizeExerciseTag(selectedExercise.bodyPart, language)}</Badge>
                <Badge variant="secondary">{localizeExerciseTag(selectedExercise.target, language)}</Badge>
                <Badge variant="secondary">{localizeExerciseTag(selectedExercise.equipment, language)}</Badge>
                {selectedExercise.difficulty && (
                  <Badge variant="outline">{localizeExerciseTag(selectedExercise.difficulty, language)}</Badge>
                )}
              </div>
              {selectedExercise.description && (
                <p className="text-sm text-muted-foreground">{localizeExerciseText(selectedExercise.description, language)}</p>
              )}
              {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{ui.howToPerform}</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    {selectedExercise.instructions.slice(0, 6).map((step, idx) => (
                      <li key={`${idx}-${step.slice(0, 12)}`}>{localizeExerciseText(step, language)}</li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{ui.videoSuggestions}</p>
                {videosQuery.isLoading ? (
                  <div className="h-10 rounded bg-secondary/30 animate-pulse" />
                ) : (videosQuery.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{ui.noVideos}</p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {(videosQuery.data ?? []).map((video) => (
                      <a
                        key={video.videoId}
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded border border-border p-2 hover:border-primary/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{video.title}</p>
                          {video.channelName && <p className="text-xs text-muted-foreground truncate">{video.channelName}</p>}
                        </div>
                        <div className="flex items-center gap-1 text-primary text-xs">
                          <PlayCircle className="w-4 h-4" />
                          {ui.open}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
