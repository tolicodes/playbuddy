import type { Event } from "../../../../../common/src/types/commonTypes";

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
  spiritual: { background: "#FFF4E6", text: "#B45309", border: "#FFD7A8" },
  social: { background: "#E9FBF3", text: "#1F8A5B", border: "#BDEDD8" },
  skill: { background: "#EEF5FF", text: "#2B5AD7", border: "#CFE0FF" },
  scene: { background: "#F6EEFF", text: "#6B35C6", border: "#DEC8FF" },
  default: { background: "#F5F1FF", text: "#4B2ABF", border: "#E3DBFF" },
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

const TYPE_LABEL_MAP: Record<string, string> = {
  play_party: "Play Party",
  munch: "Munch",
  retreat: "Retreat",
  festival: "Festival",
  workshop: "Workshop",
  performance: "Performance",
  discussion: "Discussion",
};

const LEVEL_LABEL_MAP: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const TYPE_CHIP_TONES: Record<string, TagTone> = {
  "play party": { background: "#EFE9FF", text: "#5A43B5", border: "#DED7FF" },
  munch: { background: "#FFE2B6", text: "#8A5200", border: "#F1C07A" },
  retreat: { background: "#EAF6EE", text: "#2E6B4D", border: "#D6EBDC" },
  festival: { background: "#E8F1FF", text: "#2F5DA8", border: "#D6E4FB" },
  workshop: { background: "#FDEBEC", text: "#9A3D42", border: "#F6D7DA" },
  performance: { background: "#F1E9FF", text: "#5D3FA3", border: "#E2D6FB" },
  discussion: { background: "#E8F5F8", text: "#2D5E6F", border: "#D3E7EE" },
  vetted: { background: "#E9F8EF", text: "#2F6E4A", border: "#D7F0E1" },
};

export const LEVEL_CHIP_TONE: TagTone = {
  background: "#E7F0FF",
  text: "#2F5DA8",
  border: "#D6E4FB",
};

export const EVENT_RAIL_COLORS: Record<string, string> = {
  event: "#9B8FD4",
  "play party": "#5A43B5",
  munch: "#B45309",
  retreat: "#2E6B4D",
  festival: "#2F5DA8",
  workshop: "#9A3D42",
  performance: "#5D3FA3",
  discussion: "#2D5E6F",
  default: "#9B8FD4",
};

export const getEventTypeKey = (event: Event) => {
  if (event.play_party) return "play party";
  if (event.is_munch) return "munch";
  if (event.type && event.type !== "event") {
    return event.type.replace(/_/g, " ").toLowerCase();
  }
  return "event";
};

export const getTagChips = (event: Event, limit = 6) => {
  const tagChips: TagChip[] = [];
  const seenTags = new Set<string>();

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
  if (event.type && event.type !== "event") {
    pushTag(TYPE_LABEL_MAP[event.type] || event.type.replace(/_/g, " "), "type");
  }
  if (event.classification?.experience_level) {
    const level = event.classification.experience_level.toLowerCase();
    pushTag(LEVEL_LABEL_MAP[level] || level.replace(/_/g, " "), "level");
  }
  if (event.vetted) pushTag("Vetted", "vetted");

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
