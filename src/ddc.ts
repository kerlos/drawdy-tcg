// The .ddc Card File: parse at the boundary into a typed Ddc, trust the type afterwards. See docs/ddc-format.md.
import type { DeckEntry, Lib, LibCard, LibKind } from "./types";

export type DdcCard = Omit<LibCard, "id">;
export type Ddc = { name: string } & Record<LibKind, DdcCard[]>;

const KINDS: LibKind[] = ["deck", "tokens", "customs"];
const MAX_TEXT = 80_000_000;
const MAX_CARDS = 2000;
const MAX_NAME = 80;
const MAX_COUNT = 99;
// Not svg: a data URL image can carry scripts.
const IMG = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const parseName = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_NAME).trim() : "");

export function encodeDdc(name: string, lib: Lib): string {
    const strip = (l: LibCard[]): DdcCard[] => l.map((c) => ({ name: c.name, count: c.count, img: c.img }));
    const file = { format: "ddc", version: 1, name: parseName(name), deck: strip(lib.deck), tokens: strip(lib.tokens), customs: strip(lib.customs) };
    return JSON.stringify(file, null, 1);
}

function parseCard(c: any): DdcCard | null {
    const name = parseName(c?.name);
    if (!name || typeof c.img !== "string" || !IMG.test(c.img)) return null;
    const n = typeof c.count === "number" && Number.isFinite(c.count) ? c.count : 1;
    return { name, count: Math.min(MAX_COUNT, Math.max(0, Math.floor(n))), img: c.img };
}

export function decodeDdc(text: string): { ok: true; ddc: Ddc; skipped: number } | { ok: false; error: string } {
    const fail = (error: string) => ({ ok: false as const, error });
    if (text.length > MAX_TEXT) return fail("file is too large");
    let raw: any;
    try {
        raw = JSON.parse(text);
    } catch {
        return fail("not a .ddc file (not JSON)");
    }
    if (raw?.format !== "ddc") return fail("not a .ddc file");
    if (!Number.isInteger(raw.version) || raw.version < 1) return fail("missing or invalid version");
    if (raw.version > 1) return fail("made by a newer TCG Tabletop, update to open it");
    const ddc: Ddc = { name: parseName(raw.name) || "Cards", deck: [], tokens: [], customs: [] };
    let total = 0;
    let skipped = 0;
    for (const k of KINDS) {
        const section = raw[k] === undefined ? [] : raw[k];
        if (!Array.isArray(section)) return fail(`"${k}" must be a list`);
        if ((total += section.length) > MAX_CARDS) return fail(`more than ${MAX_CARDS} cards`);
        for (const c of section) {
            const card = parseCard(c);
            if (card) ddc[k].push(card);
            else skipped++;
        }
    }
    return { ok: true, ddc, skipped };
}

const key = (name: string) => name.toLowerCase();

/**
 * Merge a file into the Library. A card is identified by its name (any case) within its section, so Decks can refer to it by name:
 * a card the Library lacks is added, one with the same name takes the file's image and starter copies (counted as updated only if
 * either changed), and cards not in the file are kept. `deck` is the file's starter Deck: its cards with 1 or more copies.
 */
export function mergeDdc(lib: Lib, ddc: Ddc, newId: () => string): { lib: Lib; added: number; updated: number; deck: DeckEntry[] } {
    let added = 0;
    let updated = 0;
    const out = {} as Lib;
    let deck: DeckEntry[] = [];
    for (const k of KINDS) {
        // Copies of one card listed twice in a file add up, and its first image wins.
        const want = new Map<string, DdcCard>();
        for (const c of ddc[k]) {
            const w = want.get(key(c.name));
            if (w) w.count = Math.min(MAX_COUNT, w.count + c.count);
            else want.set(key(c.name), { ...c });
        }
        const list = lib[k].map((c) => ({ ...c }));
        const at = new Map<string, LibCard>();
        for (const c of list) if (!at.has(key(c.name))) at.set(key(c.name), c);
        for (const [n, c] of want) {
            const hit = at.get(n);
            if (!hit) {
                list.push({ id: newId(), ...c });
                added++;
            } else if (hit.img !== c.img || hit.count !== c.count) {
                hit.img = c.img;
                hit.count = c.count;
                updated++;
            }
        }
        if (k === "deck") deck = [...want.values()].filter((c) => c.count > 0).map(({ name, count }) => ({ name, count }));
        out[k] = list;
    }
    return { lib: out, added, updated, deck };
}

export const ddcFileName = (name: string) =>
    (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cards") + ".ddc";
