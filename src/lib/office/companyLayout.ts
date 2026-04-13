import type { FurnitureItem } from "@/features/retro-office/core/types";

export const OFFICE_LAYOUT_SCHEMA_VERSION = 2;

export type CompanyOfficeLayoutDocument = {
  version: number;
  width: number;
  height: number;
  furniture: FurnitureItem[];
  savedAt?: string;
  storageNamespace?: string;
};

const isFurnitureRecord = (value: unknown): value is FurnitureItem => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FurnitureItem>;
  return (
    typeof candidate._uid === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number"
  );
};

export const parseCompanyOfficeLayoutJson = (
  raw: string | null | undefined,
): CompanyOfficeLayoutDocument | null => {
  const text = raw?.trim() ?? "";
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<CompanyOfficeLayoutDocument>;
    if (!Array.isArray(parsed.furniture)) return null;

    const furniture = parsed.furniture.filter(isFurnitureRecord);
    if (furniture.length === 0) return null;

    const snapshot = {
      version:
        typeof parsed.version === "number"
          ? parsed.version
          : OFFICE_LAYOUT_SCHEMA_VERSION,
      width: typeof parsed.width === "number" ? parsed.width : 0,
      height: typeof parsed.height === "number" ? parsed.height : 0,
      furniture,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined,
      storageNamespace:
        typeof parsed.storageNamespace === "string"
          ? parsed.storageNamespace
          : undefined,
    };

    return snapshot.version >= OFFICE_LAYOUT_SCHEMA_VERSION ? snapshot : null;
  } catch {
    return null;
  }
};

export const serializeCompanyOfficeLayout = (
  params: Omit<CompanyOfficeLayoutDocument, "version"> & { version?: number },
) =>
  JSON.stringify({
    version: params.version ?? OFFICE_LAYOUT_SCHEMA_VERSION,
    width: params.width,
    height: params.height,
    furniture: params.furniture,
    savedAt: params.savedAt,
    storageNamespace: params.storageNamespace,
  });
