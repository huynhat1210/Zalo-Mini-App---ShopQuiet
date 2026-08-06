export type ProfileGender = "male" | "female" | "other" | "";

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const normalizeGender = (value?: unknown): ProfileGender => {
  const normalized = removeDiacritics(String(value || ""));
  if (["male", "man", "nam", "1"].includes(normalized)) return "male";
  if (["female", "woman", "nu", "nữ", "2"].includes(normalized)) return "female";
  if (["other", "khac", "khác", "3"].includes(normalized)) return "other";
  return "";
};

/** Convert API ISO dates, dd/mm/yyyy, and yyyy/mm/dd into the storage format. */
export const normalizeBirthday = (value?: unknown): string => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const vietnamese = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (vietnamese) {
    return `${vietnamese[3]}-${vietnamese[2].padStart(2, "0")}-${vietnamese[1].padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
};

export const formatBirthdayVN = (value?: unknown): string => {
  const normalized = normalizeBirthday(value);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
};
