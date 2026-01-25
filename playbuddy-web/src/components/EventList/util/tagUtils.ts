import { ACTIVE_EVENT_TYPES, FALLBACK_EVENT_TYPE, type Event } from "../../../../../common/src/types/commonTypes";

export type TagChipKind = "type" | "level" | "vetted" | "tag";

export type TagChip = {
  label: string;
  kind: TagChipKind;
};

export type TagTone = {
  background: string;
  text: string;
  border: string;
};

const TAG_TONES: Record<string, TagTone> = {
  spiritual: { background: "#FAF3E6", text: "#7A5B26", border: "#F4D7A8" },
  social: { background: "#E5F4F9", text: "#004A59", border: "#C7E3EF" },
  skill: { background: "#E7EEF6", text: "#2F4A66", border: "#CAD8E5" },
  scene: { background: "#EEF1F4", text: "#3B5163", border: "#D9E0E7" },
  default: { background: "#F4F5F7", text: "#35506B", border: "#D9E0E7" },
};

const TAG_TONE_MATCHERS: Array<{ tone: keyof typeof TAG_TONES; keywords: string[] }> = [
  {
    tone: "spiritual",
    keywords: [
      "tantra",
      "spiritual",
      "meditat",
      "ritual",
      "ceremony",
      "sacred",
      "yoga",
      "breath",
      "energy",
      "shaman",
      "hypnosis",
    ],
  },
  {
    tone: "social",
    keywords: [
      "social",
      "community",
      "munch",
      "meet",
      "mingle",
      "dating",
      "poly",
      "network",
      "party",
      "celebration",
    ],
  },
  {
    tone: "skill",
    keywords: [
      "workshop",
      "class",
      "training",
      "lesson",
      "beginner",
      "intermediate",
      "advanced",
      "practice",
      "hands on",
      "education",
      "consent",
      "safety",
    ],
  },
  {
    tone: "scene",
    keywords: [
      "bdsm",
      "kink",
      "rope",
      "shibari",
      "bondage",
      "fetish",
      "impact",
      "domin",
      "submiss",
      "sadis",
      "masoch",
      "exhibition",
      "voyeur",
      "play",
      "erotic",
      "sensual",
      "sexual",
    ],
  },
];

export const getTagTone = (tag: string) => {
  const normalized = tag.trim().toLowerCase();
  const match = TAG_TONE_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  return TAG_TONES[match?.tone ?? "default"];
};

const isActiveEventType = (value?: string | null) =>
  !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);

const TYPE_LABEL_MAP: Record<string, string> = {
  event: "Event",
  play_party: "Play Party",
  munch: "Munch",
  retreat: "Retreat",
  festival: "Festival",
  conference: "Conference",
  workshop: "Workshop",
};

const LEVEL_LABEL_MAP: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const TYPE_CHIP_TONES: Record<string, TagTone> = {
  "play party": { background: "#D0EFFB", text: "#004A59", border: "#A6C7D8" },
  munch: { background: "#FAF3E6", text: "#7A5B26", border: "#F4D7A8" },
  retreat: { background: "#E9F1F6", text: "#2F4A66", border: "#C7D7E4" },
  festival: { background: "#E5EEF7", text: "#31587A", border: "#CADBEA" },
  conference: { background: "#E5EEF7", text: "#31587A", border: "#CADBEA" },
  workshop: { background: "#F1F4F7", text: "#3D4F5F", border: "#D9E0E7" },
  vetted: { background: "#E7F3EE", text: "#3B6B57", border: "#CFE2D9" },
};

export const LEVEL_CHIP_TONE: TagTone = {
  background: "#E5EEF7",
  text: "#2F4A66",
  border: "#CADBEA",
};

export const EVENT_RAIL_COLORS: Record<string, string> = {
  "play party": "#004A59",
  munch: "#7A5B26",
  retreat: "#35506B",
  festival: "#31587A",
  workshop: "#3D4F5F",
  event: "#4877A3",
  default: "#4877A3",
};

export const getEventTypeKey = (event: Event) => {
  if (event.play_party) return "play party";
  if (event.is_munch) return "munch";
  if (event.type && isActiveEventType(event.type)) {
    return event.type.replace(/_/g, " ").toLowerCase();
  }
  return FALLBACK_EVENT_TYPE;
};

export const getTagChips = (event: Event, limit = 6) => {
  const tagChips: TagChip[] = [];
  const seenTags = new Set<string>();
  const isVetted = !!(event.vetted || event.organizer?.vetted);

  const pushTag = (tag: string, kind: TagChipKind) => {
    const clean = tag.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seenTags.has(key)) return;
    if (tagChips.length >= limit) return;
    seenTags.add(key);
    tagChips.push({ label: clean, kind });
  };

  if (event.play_party) pushTag("Play Party", "type");
  if (event.is_munch) pushTag("Munch", "type");
  if (event.type && isActiveEventType(event.type)) {
    pushTag(TYPE_LABEL_MAP[event.type] || event.type.replace(/_/g, " "), "type");
  }
  if (event.classification?.experience_level) {
    const level = event.classification.experience_level.toLowerCase();
    pushTag(LEVEL_LABEL_MAP[level] || level.replace(/_/g, " "), "level");
  }
  if (isVetted) pushTag("Vetted", "vetted");

  const extraTags = [...(event.classification?.tags || []), ...(event.tags || [])];
  for (const tag of extraTags) {
    pushTag(tag, "tag");
  }

  return tagChips;
};

export const getTagChipTone = (chip: TagChip) => {
  const key = chip.label.toLowerCase();
  if (chip.kind === "level") return LEVEL_CHIP_TONE;
  if (chip.kind === "tag") return getTagTone(chip.label);
  return TYPE_CHIP_TONES[key] || TAG_TONES.default;
};
