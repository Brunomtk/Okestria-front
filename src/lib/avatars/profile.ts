export type AgentAvatarHairStyle =
  | "short" | "parted" | "spiky" | "bun"
  | "mohawk" | "afro" | "ponytail" | "braids"
  | "buzz" | "curly" | "long_straight" | "side_shave"
  | "messy" | "slicked_back" | "pigtails" | "fade";

export type AgentAvatarTopStyle =
  | "tee" | "hoodie" | "jacket"
  | "polo" | "suit" | "vest" | "tank_top"
  | "sweater" | "dress_shirt" | "lab_coat";

export type AgentAvatarBottomStyle =
  | "pants" | "shorts" | "cuffed"
  | "skirt" | "joggers" | "cargo" | "formal" | "overalls";

export type AgentAvatarHatStyle =
  | "none" | "cap" | "beanie"
  | "fedora" | "top_hat" | "cowboy" | "beret"
  | "headband" | "crown" | "santa" | "wizard" | "hard_hat";

export type AgentAvatarFacialHair = "none" | "stubble" | "full_beard" | "goatee" | "mustache" | "soul_patch";

export type AgentAvatarGlassesStyle = "none" | "round" | "square" | "aviator" | "monocle" | "sunglasses";

export type AgentAvatarEarringStyle = "none" | "stud" | "hoop" | "drop";

export type AgentAvatarWatchStyle = "none" | "digital" | "analog" | "smart";

export type AgentAvatarNeckwear = "none" | "tie" | "bowtie" | "scarf" | "necklace" | "lanyard";

export type AgentAvatarBodyBuild = "average" | "slim" | "athletic" | "stocky";

export type AgentAvatarProfile = {
  version: 1;
  seed: string;
  body: {
    skinTone: string;
    build: AgentAvatarBodyBuild;
  };
  hair: {
    style: AgentAvatarHairStyle;
    color: string;
  };
  face: {
    facialHair: AgentAvatarFacialHair;
    facialHairColor: string;
  };
  clothing: {
    topStyle: AgentAvatarTopStyle;
    topColor: string;
    bottomStyle: AgentAvatarBottomStyle;
    bottomColor: string;
    shoesColor: string;
  };
  accessories: {
    glasses: AgentAvatarGlassesStyle;
    headset: boolean;
    hatStyle: AgentAvatarHatStyle;
    backpack: boolean;
    earrings: AgentAvatarEarringStyle;
    watch: AgentAvatarWatchStyle;
    neckwear: AgentAvatarNeckwear;
  };
};

type ColorOption = {
  id: string;
  label: string;
  color: string;
};

type EnumOption<T extends string> = {
  id: T;
  label: string;
};

export const AGENT_AVATAR_SKIN_TONE_OPTIONS: ColorOption[] = [
  { id: "fair", label: "Fair", color: "#f7d7c2" },
  { id: "light", label: "Light", color: "#f4c58a" },
  { id: "warm", label: "Warm", color: "#d8a06e" },
  { id: "tan", label: "Tan", color: "#b7794e" },
  { id: "deep", label: "Deep", color: "#8a5a3b" },
  { id: "rich", label: "Rich", color: "#5d3a24" },
  { id: "porcelain", label: "Porcelain", color: "#fde8d8" },
  { id: "olive", label: "Olive", color: "#c4a265" },
  { id: "bronze", label: "Bronze", color: "#9e6b3f" },
  { id: "ebony", label: "Ebony", color: "#4a2f1a" },
];

export const AGENT_AVATAR_HAIR_STYLE_OPTIONS: EnumOption<AgentAvatarHairStyle>[] = [
  { id: "short", label: "Short" },
  { id: "parted", label: "Parted" },
  { id: "spiky", label: "Spiky" },
  { id: "bun", label: "Bun" },
  { id: "mohawk", label: "Mohawk" },
  { id: "afro", label: "Afro" },
  { id: "ponytail", label: "Ponytail" },
  { id: "braids", label: "Braids" },
  { id: "buzz", label: "Buzz" },
  { id: "curly", label: "Curly" },
  { id: "long_straight", label: "Long Straight" },
  { id: "side_shave", label: "Side Shave" },
  { id: "messy", label: "Messy" },
  { id: "slicked_back", label: "Slicked Back" },
  { id: "pigtails", label: "Pigtails" },
  { id: "fade", label: "Fade" },
];

export const AGENT_AVATAR_HAIR_COLOR_OPTIONS: ColorOption[] = [
  { id: "ink", label: "Ink", color: "#151515" },
  { id: "espresso", label: "Espresso", color: "#3e2723" },
  { id: "walnut", label: "Walnut", color: "#6b4f3a" },
  { id: "auburn", label: "Auburn", color: "#7b341e" },
  { id: "blonde", label: "Blonde", color: "#d6b56c" },
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "cyan", label: "Cyan", color: "#0891b2" },
  { id: "pink", label: "Pink", color: "#db2777" },
  { id: "platinum", label: "Platinum", color: "#e8e0d0" },
  { id: "ginger", label: "Ginger", color: "#c45e28" },
  { id: "teal", label: "Teal", color: "#14b8a6" },
  { id: "lavender", label: "Lavender", color: "#a78bfa" },
  { id: "silver", label: "Silver", color: "#94a3b8" },
  { id: "crimson", label: "Crimson", color: "#dc2626" },
];

export const AGENT_AVATAR_TOP_STYLE_OPTIONS: EnumOption<AgentAvatarTopStyle>[] = [
  { id: "tee", label: "Tee" },
  { id: "hoodie", label: "Hoodie" },
  { id: "jacket", label: "Jacket" },
  { id: "polo", label: "Polo" },
  { id: "suit", label: "Suit" },
  { id: "vest", label: "Vest" },
  { id: "tank_top", label: "Tank Top" },
  { id: "sweater", label: "Sweater" },
  { id: "dress_shirt", label: "Dress Shirt" },
  { id: "lab_coat", label: "Lab Coat" },
];

export const AGENT_AVATAR_BOTTOM_STYLE_OPTIONS: EnumOption<AgentAvatarBottomStyle>[] = [
  { id: "pants", label: "Pants" },
  { id: "shorts", label: "Shorts" },
  { id: "cuffed", label: "Cuffed" },
  { id: "skirt", label: "Skirt" },
  { id: "joggers", label: "Joggers" },
  { id: "cargo", label: "Cargo" },
  { id: "formal", label: "Formal" },
  { id: "overalls", label: "Overalls" },
];

export const AGENT_AVATAR_HAT_STYLE_OPTIONS: EnumOption<AgentAvatarHatStyle>[] = [
  { id: "none", label: "None" },
  { id: "cap", label: "Cap" },
  { id: "beanie", label: "Beanie" },
  { id: "fedora", label: "Fedora" },
  { id: "top_hat", label: "Top Hat" },
  { id: "cowboy", label: "Cowboy" },
  { id: "beret", label: "Beret" },
  { id: "headband", label: "Headband" },
  { id: "crown", label: "Crown" },
  { id: "santa", label: "Santa" },
  { id: "wizard", label: "Wizard" },
  { id: "hard_hat", label: "Hard Hat" },
];

export const AGENT_AVATAR_CLOTHING_COLOR_OPTIONS: ColorOption[] = [
  { id: "graphite", label: "Graphite", color: "#2d3748" },
  { id: "sky", label: "Sky", color: "#7090ff" },
  { id: "mint", label: "Mint", color: "#34d399" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
  { id: "rose", label: "Rose", color: "#f43f5e" },
  { id: "violet", label: "Violet", color: "#8b5cf6" },
  { id: "cream", label: "Cream", color: "#f5f5f4" },
  { id: "slate", label: "Slate", color: "#64748b" },
  { id: "navy", label: "Navy", color: "#1e3a5f" },
  { id: "forest", label: "Forest", color: "#166534" },
  { id: "burgundy", label: "Burgundy", color: "#7f1d1d" },
  { id: "coral", label: "Coral", color: "#fb7185" },
  { id: "teal", label: "Teal", color: "#0d9488" },
  { id: "charcoal", label: "Charcoal", color: "#1c1917" },
];

export const AGENT_AVATAR_SHOE_COLOR_OPTIONS: ColorOption[] = [
  { id: "black", label: "Black", color: "#1a1a1a" },
  { id: "navy", label: "Navy", color: "#1e3a8a" },
  { id: "brown", label: "Brown", color: "#7c4a2d" },
  { id: "white", label: "White", color: "#e5e7eb" },
  { id: "red", label: "Red", color: "#b91c1c" },
  { id: "tan", label: "Tan", color: "#c2956a" },
  { id: "gray", label: "Gray", color: "#6b7280" },
  { id: "green", label: "Green", color: "#15803d" },
];

export const AGENT_AVATAR_FACIAL_HAIR_OPTIONS: EnumOption<AgentAvatarFacialHair>[] = [
  { id: "none", label: "None" },
  { id: "stubble", label: "Stubble" },
  { id: "full_beard", label: "Full Beard" },
  { id: "goatee", label: "Goatee" },
  { id: "mustache", label: "Mustache" },
  { id: "soul_patch", label: "Soul Patch" },
];

export const AGENT_AVATAR_GLASSES_STYLE_OPTIONS: EnumOption<AgentAvatarGlassesStyle>[] = [
  { id: "none", label: "None" },
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "aviator", label: "Aviator" },
  { id: "monocle", label: "Monocle" },
  { id: "sunglasses", label: "Sunglasses" },
];

export const AGENT_AVATAR_EARRING_STYLE_OPTIONS: EnumOption<AgentAvatarEarringStyle>[] = [
  { id: "none", label: "None" },
  { id: "stud", label: "Stud" },
  { id: "hoop", label: "Hoop" },
  { id: "drop", label: "Drop" },
];

export const AGENT_AVATAR_WATCH_STYLE_OPTIONS: EnumOption<AgentAvatarWatchStyle>[] = [
  { id: "none", label: "None" },
  { id: "digital", label: "Digital" },
  { id: "analog", label: "Analog" },
  { id: "smart", label: "Smart" },
];

export const AGENT_AVATAR_NECKWEAR_OPTIONS: EnumOption<AgentAvatarNeckwear>[] = [
  { id: "none", label: "None" },
  { id: "tie", label: "Tie" },
  { id: "bowtie", label: "Bow Tie" },
  { id: "scarf", label: "Scarf" },
  { id: "necklace", label: "Necklace" },
  { id: "lanyard", label: "Lanyard" },
];

export const AGENT_AVATAR_BODY_BUILD_OPTIONS: EnumOption<AgentAvatarBodyBuild>[] = [
  { id: "average", label: "Average" },
  { id: "slim", label: "Slim" },
  { id: "athletic", label: "Athletic" },
  { id: "stocky", label: "Stocky" },
];

const AGENT_AVATAR_VERSION = 1 as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const coerceString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pick = <T,>(values: readonly T[], index: number) => values[index % values.length];

const resolveColor = (value: unknown, options: ColorOption[], fallback: string) => {
  const color = coerceString(value).toLowerCase();
  if (!color) return fallback;
  const option =
    options.find((entry) => entry.id === color) ??
    options.find((entry) => entry.color.toLowerCase() === color);
  return option?.color ?? fallback;
};

const resolveEnumOption = <T extends string>(
  value: unknown,
  options: EnumOption<T>[],
  fallback: T,
): T => {
  const normalized = coerceString(value).toLowerCase();
  const match = options.find((entry) => entry.id === normalized);
  return match?.id ?? fallback;
};

export const createAgentAvatarProfileFromSeed = (seed: string): AgentAvatarProfile => {
  const normalizedSeed = seed.trim() || "agent";
  const hash = hashSeed(normalizedSeed);
  const skinTone = pick(AGENT_AVATAR_SKIN_TONE_OPTIONS, hash).color;
  const hairStyle = pick(AGENT_AVATAR_HAIR_STYLE_OPTIONS, hash >>> 3).id;
  const hairColor = pick(AGENT_AVATAR_HAIR_COLOR_OPTIONS, hash >>> 5).color;
  const topStyle = pick(AGENT_AVATAR_TOP_STYLE_OPTIONS, hash >>> 7).id;
  const topColor = pick(AGENT_AVATAR_CLOTHING_COLOR_OPTIONS, hash >>> 9).color;
  const bottomStyle = pick(AGENT_AVATAR_BOTTOM_STYLE_OPTIONS, hash >>> 11).id;
  const bottomColor = pick(AGENT_AVATAR_CLOTHING_COLOR_OPTIONS, hash >>> 13).color;
  const shoesColor = pick(AGENT_AVATAR_SHOE_COLOR_OPTIONS, hash >>> 15).color;
  const hatStyle = pick(AGENT_AVATAR_HAT_STYLE_OPTIONS, hash >>> 17).id;
  const build = pick(AGENT_AVATAR_BODY_BUILD_OPTIONS, hash >>> 24).id;
  const facialHair = pick(AGENT_AVATAR_FACIAL_HAIR_OPTIONS, hash >>> 25).id;
  const facialHairColor = pick(AGENT_AVATAR_HAIR_COLOR_OPTIONS, hash >>> 26).color;
  const glassesStyle = pick(AGENT_AVATAR_GLASSES_STYLE_OPTIONS, hash >>> 27).id;
  const earrings = pick(AGENT_AVATAR_EARRING_STYLE_OPTIONS, hash >>> 28).id;
  const watch = pick(AGENT_AVATAR_WATCH_STYLE_OPTIONS, hash >>> 29).id;
  const neckwear = pick(AGENT_AVATAR_NECKWEAR_OPTIONS, hash >>> 30).id;

  return {
    version: AGENT_AVATAR_VERSION,
    seed: normalizedSeed,
    body: {
      skinTone,
      build,
    },
    hair: {
      style: hairStyle,
      color: hairColor,
    },
    face: {
      facialHair,
      facialHairColor,
    },
    clothing: {
      topStyle,
      topColor,
      bottomStyle,
      bottomColor,
      shoesColor,
    },
    accessories: {
      glasses: glassesStyle,
      headset: Boolean((hash >>> 19) % 5 === 0),
      hatStyle,
      backpack: Boolean((hash >>> 21) % 4 === 0),
      earrings,
      watch,
      neckwear,
    },
  };
};

export const createDefaultAgentAvatarProfile = (seed: string): AgentAvatarProfile =>
  createAgentAvatarProfileFromSeed(seed);

export const normalizeAgentAvatarProfile = (
  value: unknown,
  fallbackSeed: string,
): AgentAvatarProfile => {
  if (typeof value === "string") {
    return createAgentAvatarProfileFromSeed(value);
  }

  const baseProfile = createAgentAvatarProfileFromSeed(fallbackSeed);
  if (!isRecord(value)) {
    return baseProfile;
  }

  const body = isRecord(value.body) ? value.body : {};
  const hair = isRecord(value.hair) ? value.hair : {};
  const face = isRecord(value.face) ? value.face : {};
  const clothing = isRecord(value.clothing) ? value.clothing : {};
  const accessories = isRecord(value.accessories) ? value.accessories : {};
  const normalizedSeed = coerceString(value.seed) || baseProfile.seed;

  return {
    version: AGENT_AVATAR_VERSION,
    seed: normalizedSeed,
    body: {
      skinTone: resolveColor(
        body.skinTone,
        AGENT_AVATAR_SKIN_TONE_OPTIONS,
        baseProfile.body.skinTone,
      ),
      build: resolveEnumOption(
        body.build,
        AGENT_AVATAR_BODY_BUILD_OPTIONS,
        baseProfile.body.build,
      ),
    },
    hair: {
      style: resolveEnumOption(
        hair.style,
        AGENT_AVATAR_HAIR_STYLE_OPTIONS,
        baseProfile.hair.style,
      ),
      color: resolveColor(
        hair.color,
        AGENT_AVATAR_HAIR_COLOR_OPTIONS,
        baseProfile.hair.color,
      ),
    },
    face: {
      facialHair: resolveEnumOption(
        face.facialHair,
        AGENT_AVATAR_FACIAL_HAIR_OPTIONS,
        baseProfile.face.facialHair,
      ),
      facialHairColor: resolveColor(
        face.facialHairColor,
        AGENT_AVATAR_HAIR_COLOR_OPTIONS,
        baseProfile.face.facialHairColor,
      ),
    },
    clothing: {
      topStyle: resolveEnumOption(
        clothing.topStyle,
        AGENT_AVATAR_TOP_STYLE_OPTIONS,
        baseProfile.clothing.topStyle,
      ),
      topColor: resolveColor(
        clothing.topColor,
        AGENT_AVATAR_CLOTHING_COLOR_OPTIONS,
        baseProfile.clothing.topColor,
      ),
      bottomStyle: resolveEnumOption(
        clothing.bottomStyle,
        AGENT_AVATAR_BOTTOM_STYLE_OPTIONS,
        baseProfile.clothing.bottomStyle,
      ),
      bottomColor: resolveColor(
        clothing.bottomColor,
        AGENT_AVATAR_CLOTHING_COLOR_OPTIONS,
        baseProfile.clothing.bottomColor,
      ),
      shoesColor: resolveColor(
        clothing.shoesColor,
        AGENT_AVATAR_SHOE_COLOR_OPTIONS,
        baseProfile.clothing.shoesColor,
      ),
    },
    accessories: {
      glasses: resolveEnumOption(
        accessories.glasses,
        AGENT_AVATAR_GLASSES_STYLE_OPTIONS,
        baseProfile.accessories.glasses,
      ),
      headset:
        typeof accessories.headset === "boolean"
          ? accessories.headset
          : baseProfile.accessories.headset,
      hatStyle: resolveEnumOption(
        accessories.hatStyle,
        AGENT_AVATAR_HAT_STYLE_OPTIONS,
        baseProfile.accessories.hatStyle,
      ),
      backpack:
        typeof accessories.backpack === "boolean"
          ? accessories.backpack
          : baseProfile.accessories.backpack,
      earrings: resolveEnumOption(
        accessories.earrings,
        AGENT_AVATAR_EARRING_STYLE_OPTIONS,
        baseProfile.accessories.earrings,
      ),
      watch: resolveEnumOption(
        accessories.watch,
        AGENT_AVATAR_WATCH_STYLE_OPTIONS,
        baseProfile.accessories.watch,
      ),
      neckwear: resolveEnumOption(
        accessories.neckwear,
        AGENT_AVATAR_NECKWEAR_OPTIONS,
        baseProfile.accessories.neckwear,
      ),
    },
  };
};
