// lib/page-blocks.spec.ts — protects the EN/BN join every public page reads
// through. `bodyEn` is structural and authoritative; `bodyBn` only supplies
// text, position by position. A wrong join shows the wrong translation beside
// the right icon with no error anywhere, so it is tested directly.

import { describe, expect, it } from "vitest";
import { bodyFor, listOf, numberOf, parseBody, text } from "./page-blocks";

const EN = JSON.stringify({
    title: "Our Facilities",
    subtitle: "Infrastructure",
    variant: "facilities",
    items: [
        { icon: "FaFlask", title: "Science Labs", desc: "Physics lab", subjects: ["Physics", "Chemistry"] },
        { icon: "FaBook", title: "Library", desc: "Ten thousand books" },
    ],
});

const BN = JSON.stringify({
    title: "আমাদের সুবিধা",
    items: [
        { title: "বিজ্ঞানাগার", desc: "পদার্থ ল্যাব" },
        { title: "গ্রন্থাগার" },
    ],
});

describe("parseBody", () => {
    it("reads a stored object", () => {
        expect(parseBody('{"title":"x"}')).toEqual({ title: "x" });
    });

    it("reads anything that is not a JSON object as empty", () => {
        expect(parseBody(null)).toEqual({});
        expect(parseBody("")).toEqual({});
        expect(parseBody("not json")).toEqual({});
        expect(parseBody("[1,2]")).toEqual({});
        expect(parseBody("null")).toEqual({});
    });
});

describe("bodyFor", () => {
    it("returns the English document unchanged for English", () => {
        expect(bodyFor("cards", EN, BN, "en")).toEqual(parseBody(EN));
    });

    it("takes Bengali text but keeps structure and shared fields from English", () => {
        const body = bodyFor("cards", EN, BN, "bn");
        const items = body.items ?? [];
        expect(body.title).toBe("আমাদের সুবিধা");
        expect(body.variant).toBe("facilities");
        expect(items[0].title).toBe("বিজ্ঞানাগার");
        expect(items[0].desc).toBe("পদার্থ ল্যাব");
        // Icon and list are structural: they come from bodyEn.
        expect(items[0].icon).toBe("FaFlask");
        expect(items[0].subjects).toEqual(["Physics", "Chemistry"]);
    });

    it("falls back to English per field, not per block", () => {
        const body = bodyFor("cards", EN, BN, "bn");
        const items = body.items ?? [];
        expect(items[1].title).toBe("গ্রন্থাগার");
        expect(items[1].desc).toBe("Ten thousand books");
        expect(body.subtitle).toBe("Infrastructure");
    });

    it("ignores extra Bengali rows and never invents one", () => {
        const longer = JSON.stringify({
            items: [{ title: "a" }, { title: "b" }, { title: "surplus" }],
        });
        expect((bodyFor("cards", EN, longer, "bn").items ?? []).length).toBe(2);
    });

    it("keeps English text for rows Bengali has not reached", () => {
        const shorter = JSON.stringify({ items: [{ title: "প্রথম" }] });
        const items = bodyFor("cards", EN, shorter, "bn").items ?? [];
        expect(items[0].title).toBe("প্রথম");
        expect(items[1].title).toBe("Library");
    });

    it("does not crash on an unknown kind", () => {
        expect(bodyFor("not-a-kind", EN, BN, "bn")).toEqual(parseBody(EN));
    });
});

describe("value helpers", () => {
    it("text keeps only non-empty strings", () => {
        expect(text("hello")).toBe("hello");
        expect(text("", "fallback")).toBe("fallback");
        expect(text(undefined, "fallback")).toBe("fallback");
        expect(text(42, "fallback")).toBe("fallback");
    });

    it("listOf keeps string items only", () => {
        expect(listOf(["a", 2, "b"])).toEqual(["a", "b"]);
        expect(listOf("nope")).toEqual([]);
        expect(listOf(undefined)).toEqual([]);
    });

    it("numberOf accepts numbers and numeric strings", () => {
        expect(numberOf(97.3)).toBe(97.3);
        expect(numberOf("536")).toBe(536);
        expect(numberOf(null, 7)).toBe(7);
        expect(numberOf("abc", 7)).toBe(7);
    });
});
