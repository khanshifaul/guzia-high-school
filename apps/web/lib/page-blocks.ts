// lib/page-blocks.ts — the one contract for admin-editable page content.
//
// A Block row carries two JSON documents, `bodyEn` and `bodyBn`. `bodyEn` is
// authoritative for STRUCTURE and for every field that is not language-specific
// (icon name, href, number, colour class). `bodyBn` carries the Bengali text of
// the same rows, position by position. `bodyFor()` is the only place the two are
// joined, so the public pages never decide for themselves how a translation
// falls back.
//
// The admin editor is generated from these field specs: changing a field here
// changes the editor and the validation vocabulary, not a second copy.

export type BlockKind =
    | "cards"
    | "stats"
    | "testimonials"
    | "gallery"
    | "services"
    | "links"
    | "hotlines";

export type Language = "en" | "bn";

/** One repeated row inside a block body. */
export interface BlockItem {
    [field: string]: unknown;
}

export interface BlockBody {
    title?: string;
    subtitle?: string;
    footnote?: string;
    /** Visual treatment for a `cards` block: highlights | programs | facilities | values | accent. */
    variant?: string;
    items?: BlockItem[];
    [field: string]: unknown;
}

/** The shape `GET /pages/:slug` returns (and the admin editor loads). */
export interface PageBlock {
    id: string;
    key: string;
    kind: string;
    sortOrder: number;
    bodyEn: string;
    bodyBn: string;
    imageUrl: string;
    linkUrl: string;
    published: boolean;
}

export interface PagePayload {
    slug: string;
    title: string;
    titleBn: string;
    published: boolean;
    blocks: PageBlock[];
}

// ─── Field vocabulary ────────────────────────────────────────────────

export type FieldType =
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "icon"
    | "url"
    | "list";

export interface FieldSpec {
    key: string;
    label: string;
    type: FieldType;
    /**
     * true: the value is human language, so it is edited in both columns.
     * false: structural (href, icon, number, colour) and read from `bodyEn`
     * by both languages.
     */
    bilingual: boolean;
    options?: readonly string[];
    placeholder?: string;
}

export interface BlockKindSpec {
    kind: BlockKind;
    label: string;
    /** Singular noun for repeated rows, or null when the block has none. */
    itemNoun: string | null;
    fields: readonly FieldSpec[];
    itemFields: readonly FieldSpec[];
}

/** Gallery tile backgrounds. Kept as literals so Tailwind emits the classes. */
export const GALLERY_TINTS = [
    "from-blue-400/20 to-blue-600/20",
    "from-emerald-400/20 to-emerald-600/20",
    "from-green-400/20 to-green-600/20",
    "from-purple-400/20 to-purple-600/20",
    "from-rose-400/20 to-rose-600/20",
    "from-amber-400/20 to-amber-600/20",
    "from-indigo-400/20 to-indigo-600/20",
    "from-cyan-400/20 to-cyan-600/20",
] as const;

/** Emergency-hotline badge backgrounds. Literals, for the same reason. */
export const HOTLINE_COLORS = [
    "bg-rose-700",
    "bg-emerald-700",
    "bg-orange-700",
    "bg-amber-700",
    "bg-pink-700",
    "bg-sky-700",
    "bg-teal-700",
    "bg-indigo-700",
] as const;

/** The computed values a `stats` row may derive instead of storing a number. */
export const STAT_COMPUTES = ["", "years-since-established"] as const;

const CARDS_VARIANTS = [
    "highlights",
    "programs",
    "facilities",
    "values",
    "accent",
] as const;

const field = (key: string, label: string, bilingual = true): FieldSpec => ({
    key,
    label,
    type: "text",
    bilingual,
});

export const BLOCK_KINDS: Record<BlockKind, BlockKindSpec> = {
    cards: {
        kind: "cards",
        label: "Card grid",
        itemNoun: "card",
        fields: [
            field("title", "Section title"),
            field("subtitle", "Section subtitle"),
            {
                key: "variant",
                label: "Layout",
                type: "select",
                bilingual: false,
                options: CARDS_VARIANTS,
            },
            field("footnote", "Footnote"),
        ],
        itemFields: [
            { key: "icon", label: "Icon", type: "icon", bilingual: false },
            field("title", "Title"),
            { key: "desc", label: "Description", type: "textarea", bilingual: true },
            {
                key: "subjects",
                label: "Subjects (comma-separated)",
                type: "list",
                bilingual: true,
                placeholder: "Physics, Chemistry",
            },
        ],
    },
    stats: {
        kind: "stats",
        label: "Statistics row",
        itemNoun: "statistic",
        fields: [],
        itemFields: [
            { key: "icon", label: "Icon", type: "icon", bilingual: false },
            { key: "end", label: "Value", type: "number", bilingual: false },
            {
                key: "compute",
                label: "Computed value",
                type: "select",
                bilingual: false,
                options: STAT_COMPUTES,
            },
            field("suffix", "Suffix", false),
            field("label", "Label"),
        ],
    },
    testimonials: {
        kind: "testimonials",
        label: "Testimonials",
        itemNoun: "testimonial",
        fields: [field("title", "Section title"), field("subtitle", "Section subtitle")],
        itemFields: [
            field("name", "Name", false),
            field("role", "Role"),
            { key: "quote", label: "Quote", type: "textarea", bilingual: true },
        ],
    },
    gallery: {
        kind: "gallery",
        label: "Gallery strip",
        itemNoun: "tile",
        fields: [field("title", "Section title"), field("subtitle", "Section subtitle")],
        itemFields: [
            field("label", "Caption"),
            { key: "imageUrl", label: "Image URL", type: "url", bilingual: false },
            {
                key: "tint",
                label: "Tile tint",
                type: "select",
                bilingual: false,
                options: GALLERY_TINTS,
            },
        ],
    },
    services: {
        kind: "services",
        label: "Online service cards",
        itemNoun: "service",
        fields: [field("title", "Section title"), field("subtitle", "Section subtitle")],
        itemFields: [
            field("key", "Portal key", false),
            field("title", "Title"),
            field("desc", "Description"),
            { key: "icon", label: "Icon", type: "icon", bilingual: false },
        ],
    },
    links: {
        kind: "links",
        label: "Link list",
        itemNoun: "link",
        fields: [field("title", "List heading")],
        itemFields: [
            field("href", "Link", false),
            field("label", "Label"),
        ],
    },
    hotlines: {
        kind: "hotlines",
        label: "Emergency hotlines",
        itemNoun: "hotline",
        fields: [field("title", "Section title")],
        itemFields: [
            field("num", "Number", false),
            field("label", "Label"),
            {
                key: "color",
                label: "Badge colour",
                type: "select",
                bilingual: false,
                options: HOTLINE_COLORS,
            },
        ],
    },
};

/** Spec for a stored kind; an unknown kind is editable as text only, never a crash. */
export function kindSpec(kind: string): BlockKindSpec | null {
    return kind in BLOCK_KINDS ? BLOCK_KINDS[kind as BlockKind] : null;
}

export const BLOCK_KIND_OPTIONS = Object.values(BLOCK_KINDS);

// ─── Reading a block ─────────────────────────────────────────────────

/** Parse a stored body. Anything that is not a JSON object reads as `{}`. */
export function parseBody(raw: string | null | undefined): BlockBody {
    if (!raw) return {};
    try {
        const value: unknown = JSON.parse(raw);
        return value !== null && typeof value === "object" && !Array.isArray(value)
            ? (value as BlockBody)
            : {};
    } catch {
        return {};
    }
}

const NO_SPEC: BlockKindSpec = {
    kind: "cards",
    label: "Unknown",
    itemNoun: null,
    fields: [],
    itemFields: [],
};

/**
 * Join a block's two language documents into the one document a renderer
 * reads. Structure and structural fields come from `bodyEn`; text fields come
 * from `bodyBn` when the Bengali value is non-empty, otherwise from English.
 */
export function bodyFor(
    kind: string,
    bodyEn: string | null | undefined,
    bodyBn: string | null | undefined,
    language: Language,
): BlockBody {
    const en = parseBody(bodyEn);
    if (language === "en") return en;

    const spec = kindSpec(kind) ?? NO_SPEC;
    const bn = parseBody(bodyBn);
    const merged: BlockBody = { ...en };

    for (const field of spec.fields) {
        if (field.bilingual && isText(bn[field.key])) merged[field.key] = bn[field.key];
    }

    if (spec.itemFields.length > 0) {
        const enItems = Array.isArray(en.items) ? en.items : [];
        const bnItems = Array.isArray(bn.items) ? bn.items : [];
        merged.items = enItems.map((item, index) => {
            const translated = bnItems[index];
            if (translated === null || typeof translated !== "object") return item;
            const out: BlockItem = { ...item };
            for (const field of spec.itemFields) {
                if (!field.bilingual) continue;
                const value = (translated as BlockItem)[field.key];
                if (field.type === "list") {
                    if (Array.isArray(value) && value.every(isText)) out[field.key] = value;
                } else if (isText(value)) {
                    out[field.key] = value;
                }
            }
            return out;
        });
    }

    return merged;
}

function isText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/** A string field, or `fallback` when the stored value is not a non-empty string. */
export function text(value: unknown, fallback = ""): string {
    return isText(value) ? value : fallback;
}

/** A string-list field; anything else reads as an empty list. */
export function listOf(value: unknown): string[] {
    return Array.isArray(value) ? value.filter(isText) : [];
}

/** A number field; anything else reads as `fallback`. */
export function numberOf(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

/** An empty body for a new block, including one blank row for item blocks. */
export function emptyBody(kind: BlockKind): BlockBody {
    const spec = BLOCK_KINDS[kind];
    const body: BlockBody = {};
    if (kind === "cards") body.variant = "highlights";
    if (spec.itemFields.length > 0) body.items = [{}];
    return body;
}
