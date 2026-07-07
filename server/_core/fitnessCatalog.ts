import { ENV } from "./env";

export type ExerciseCatalogItem = {
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

export type ExerciseVideoItem = {
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  url: string;
};

export type ExerciseCatalogFilters = {
  bodyPart?: string;
  target?: string;
};

type FreeExerciseDbRow = {
  id?: string;
  name?: string;
  equipment?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
  level?: string;
  images?: string[];
};

class RapidApiError extends Error {
  status: number;
  responseBody: string;

  constructor(status: number, message: string, responseBody: string) {
    super(message);
    this.status = status;
    this.responseBody = responseBody;
  }
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CACHE_TTL_MS = 1000 * 60 * 10;
const FREE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const exerciseCache = new Map<string, CacheEntry<ExerciseCatalogItem[]>>();
const videoCache = new Map<string, CacheEntry<ExerciseVideoItem[]>>();
let freeCatalogCache: CacheEntry<ExerciseCatalogItem[]> | null = null;
let freeCatalogPromise: Promise<ExerciseCatalogItem[]> | null = null;

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getRapidApiConfig() {
  const exerciseHost = ENV.exerciseDbApiHost;
  const youtubeHost = ENV.youtubeApiHost;
  if (!exerciseHost || !youtubeHost) {
    throw new Error("RapidAPI hosts are not configured");
  }
  return { apiKey: ENV.rapidApiKey, exerciseHost, youtubeHost };
}

async function fetchRapidJson<T>(url: string, host: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const bodySnippet = body.slice(0, 180);
    if (response.status === 401 || response.status === 403) {
      throw new RapidApiError(
        response.status,
        "RapidAPI access denied. Please subscribe to this API and verify RAPIDAPI_KEY.",
        bodySnippet
      );
    }
    if (response.status === 429) {
      throw new RapidApiError(
        response.status,
        "RapidAPI rate limit reached. Wait a minute, then retry (or upgrade your RapidAPI plan).",
        bodySnippet
      );
    }
    throw new RapidApiError(
      response.status,
      `RapidAPI request failed (${response.status}).`,
      bodySnippet
    );
  }

  return (await response.json()) as T;
}

function sanitizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildFreeExerciseImageUrl(path: string): string | undefined {
  const cleaned = sanitizeText(path);
  if (!cleaned) return undefined;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  const base = ENV.freeExerciseImageBaseUrl.endsWith("/")
    ? ENV.freeExerciseImageBaseUrl
    : `${ENV.freeExerciseImageBaseUrl}/`;
  const encodedPath = cleaned
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}${encodedPath}`;
}

function normalizeFilter(value?: string): string {
  return normalizeSearch(value ?? "");
}

function matchesFilters(item: ExerciseCatalogItem, filters: ExerciseCatalogFilters): boolean {
  const bodyPartFilter = normalizeFilter(filters.bodyPart);
  const targetFilter = normalizeFilter(filters.target);
  if (bodyPartFilter && normalizeSearch(item.bodyPart) !== bodyPartFilter) return false;
  if (targetFilter && normalizeSearch(item.target) !== targetFilter) return false;
  return true;
}

function mapFreeExerciseRow(row: FreeExerciseDbRow, index: number): ExerciseCatalogItem | undefined {
  const name = sanitizeText(row.name);
  if (!name) return undefined;
  const id = sanitizeText(row.id) || `free-${index}`;
  const bodyPart = sanitizeText(row.primaryMuscles?.[0]) || sanitizeText(row.category) || "full body";
  const target = sanitizeText(row.primaryMuscles?.[0]) || bodyPart;
  const equipment = sanitizeText(row.equipment) || "body weight";
  const gifUrl = buildFreeExerciseImageUrl(row.images?.[0] ?? "");
  const instructions = Array.isArray(row.instructions)
    ? row.instructions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;
  const description = instructions?.[0];
  const difficulty = sanitizeText(row.level) || undefined;
  const category = sanitizeText(row.category) || undefined;

  return {
    id,
    name,
    bodyPart,
    target,
    equipment,
    gifUrl,
    instructions,
    description,
    difficulty,
    category,
  };
}

async function loadFreeExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  if (freeCatalogCache && freeCatalogCache.expiresAt > Date.now()) {
    return freeCatalogCache.value;
  }
  if (freeCatalogPromise) {
    return freeCatalogPromise;
  }

  freeCatalogPromise = (async () => {
    const response = await fetch(ENV.freeExerciseDbUrl);
    if (!response.ok) {
      throw new Error(`Free catalog request failed (${response.status}).`);
    }
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("Free catalog payload is not an array.");
    }

    const mapped = payload
      .map((item, index) => mapFreeExerciseRow(item as FreeExerciseDbRow, index))
      .filter((item): item is ExerciseCatalogItem => Boolean(item));
    freeCatalogCache = { value: mapped, expiresAt: Date.now() + FREE_CACHE_TTL_MS };
    return mapped;
  })().finally(() => {
    freeCatalogPromise = null;
  });

  return freeCatalogPromise;
}

async function searchFreeExerciseCatalog(
  query: string,
  limit: number,
  filters: ExerciseCatalogFilters
): Promise<ExerciseCatalogItem[]> {
  const catalog = await loadFreeExerciseCatalog();
  const normalizedQuery = normalizeSearch(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  const rank = (item: ExerciseCatalogItem) => {
    const target = normalizeSearch(
      `${item.name} ${item.bodyPart} ${item.target} ${item.equipment} ${item.category ?? ""}`
    );
    let score = 0;
    for (const term of terms) {
      if (target.startsWith(term)) score += 4;
      else if (target.includes(term)) score += 2;
    }
    if (normalizedQuery && normalizeSearch(item.name).startsWith(normalizedQuery)) score += 3;
    return score;
  };

  return catalog
    .filter((item) => matchesFilters(item, filters))
    .map((item) => ({ item, score: rank(item) }))
    .filter((entry) => (terms.length > 0 ? entry.score > 0 : true))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

async function searchRapidExerciseCatalog(
  query: string,
  limit: number,
  filters: ExerciseCatalogFilters
): Promise<ExerciseCatalogItem[]> {
  const { apiKey, exerciseHost } = getRapidApiConfig();
  if (!apiKey) return [];

  const encoded = encodeURIComponent(query);
  const candidateUrls = [
    `https://${exerciseHost}/exercises/name/${encoded}?limit=${limit}&offset=0`,
    `https://${exerciseHost}/v1/exercises/name/${encoded}?limit=${limit}&offset=0`,
    `https://${exerciseHost}/api/v1/exercises/name/${encoded}?limit=${limit}&offset=0`,
    `https://${exerciseHost}/exercises?name=${encoded}&limit=${limit}&offset=0`,
  ];

  let data: unknown = [];
  let lastError: RapidApiError | null = null;
  for (const url of candidateUrls) {
    try {
      data = await fetchRapidJson<unknown>(url, exerciseHost, apiKey);
      lastError = null;
      break;
    } catch (error) {
      if (!(error instanceof RapidApiError)) throw error;
      if (error.status === 404) {
        lastError = error;
        continue;
      }
      throw new Error(`${error.message}${error.responseBody ? ` (${error.responseBody})` : ""}`);
    }
  }

  if (lastError || !Array.isArray(data)) return [];

  const results: ExerciseCatalogItem[] = [];
  for (const item of data) {
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "");
    const name = String(row.name ?? "");
    if (!id || !name) continue;

    const bodyPart = String(row.bodyPart ?? "");
    const target = String(row.target ?? "");
    const equipment = String(row.equipment ?? "");
    const gifUrl =
      typeof row.gifUrl === "string"
        ? row.gifUrl
        : typeof row.gifurl === "string"
          ? row.gifurl
          : undefined;
    const instructions = Array.isArray(row.instructions)
      ? row.instructions.filter((v): v is string => typeof v === "string")
      : undefined;
    const description = typeof row.description === "string" ? row.description : undefined;
    const difficulty = typeof row.difficulty === "string" ? row.difficulty : undefined;
    const category = typeof row.category === "string" ? row.category : undefined;

    results.push({
      id,
      name,
      bodyPart,
      target,
      equipment,
      gifUrl,
      description,
      difficulty,
      category,
      instructions,
    });
  }

  return results.filter((item) => matchesFilters(item, filters));
}

export async function searchExerciseCatalog(
  query: string,
  limit: number = 20,
  filters: ExerciseCatalogFilters = {}
): Promise<ExerciseCatalogItem[]> {
  const normalized = query.trim();
  const hasFilters = Boolean(filters.bodyPart || filters.target);
  if (!normalized && !hasFilters) return [];
  const safeLimit = Math.max(1, Math.min(limit, 30));
  const cacheKey = `${normalizeSearch(normalized)}::${safeLimit}::${normalizeFilter(filters.bodyPart)}::${normalizeFilter(filters.target)}`;
  const cached = readCache(exerciseCache, cacheKey);
  if (cached) return cached;

  let results: ExerciseCatalogItem[] = [];

  if (normalized) {
    try {
      results = await searchRapidExerciseCatalog(normalized, safeLimit, filters);
    } catch (error) {
      console.warn("[FitnessCatalog] RapidAPI search failed, using free catalog fallback.", error);
    }
  }

  if (results.length === 0) {
    results = await searchFreeExerciseCatalog(normalized, safeLimit, filters);
  }

  writeCache(exerciseCache, cacheKey, results);
  return results;
}

export async function getExerciseCatalogFacets(): Promise<{ bodyParts: string[]; targets: string[] }> {
  const catalog = await loadFreeExerciseCatalog();
  const bodyPartSet = new Set<string>();
  const targetSet = new Set<string>();

  for (const item of catalog) {
    if (item.bodyPart) bodyPartSet.add(item.bodyPart);
    if (item.target) targetSet.add(item.target);
  }

  return {
    bodyParts: Array.from(bodyPartSet).sort((a, b) => a.localeCompare(b)),
    targets: Array.from(targetSet).sort((a, b) => a.localeCompare(b)),
  };
}

export async function searchExerciseVideos(query: string, limit: number = 6): Promise<ExerciseVideoItem[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const cacheKey = `${normalizeSearch(normalized)}::${safeLimit}`;
  const cached = readCache(videoCache, cacheKey);
  if (cached) return cached;

  const { apiKey, youtubeHost } = getRapidApiConfig();
  if (!apiKey) return [];

  const encoded = encodeURIComponent(normalized);
  const url = `https://${youtubeHost}/search?query=${encoded}&hl=en&gl=US`;

  let data: Record<string, unknown>;
  try {
    data = await fetchRapidJson<Record<string, unknown>>(url, youtubeHost, apiKey);
  } catch (error) {
    if (error instanceof RapidApiError) {
      console.warn("[FitnessCatalog] Video search failed.", error.message);
      return [];
    }
    throw error;
  }

  const contents = Array.isArray(data.contents) ? data.contents : [];
  const videos: ExerciseVideoItem[] = [];
  for (const entry of contents) {
    const wrapper = entry as Record<string, unknown>;
    const video = wrapper.video as Record<string, unknown> | undefined;
    if (!video) continue;

    const videoId = typeof video.videoId === "string" ? video.videoId : "";
    if (!videoId) continue;

    const thumbnails = Array.isArray(video.thumbnails)
      ? (video.thumbnails as Array<Record<string, unknown>>)
      : [];
    const thumbnailUrl = thumbnails.find((t) => typeof t.url === "string")?.url as string | undefined;
    const title = typeof video.title === "string" ? video.title : "Exercise Video";
    const channelName = typeof video.channelName === "string" ? video.channelName : undefined;

    videos.push({
      videoId,
      title,
      channelName,
      thumbnailUrl,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  const limited = videos.slice(0, safeLimit);
  writeCache(videoCache, cacheKey, limited);
  return limited;
}
