// Decks: named lists of Library card names and amounts, shared as text ("4x Card Name"). See docs/decks.md.
// No value imports: the tests run this file directly under node.
import type { Deck, DeckEntry, LibCard } from "./types";

const MAX_NAME = 80;
const MAX_COUNT = 99;
const MAX_DECKS = 200;
const MAX_ENTRIES = 500;

const parseName = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_NAME).trim() : "");
const key = (s: string) => s.toLowerCase();

/** Add copies of a card to a list: same name (any case) adds up, capped at 99; empty names and counts below 1 are dropped. */
function addEntry(list: DeckEntry[], name: string, count: number) {
    count = Math.floor(count);
    if (!name || !Number.isFinite(count) || count < 1) return;
    // ponytail: linear scan per line, fine under the 500 entry cap.
    const hit = list.find((e) => key(e.name) === key(name));
    if (hit) hit.count = Math.min(MAX_COUNT, hit.count + count);
    else if (list.length < MAX_ENTRIES) list.push({ name, count: Math.min(MAX_COUNT, count) });
}

/**
 * One card per line: "4x Name", "4 x Name", "4 Name", or just "Name" for one copy. Blank lines and lines starting with # or // are ignored.
 * A name that starts with a number needs its amount spelled out ("1x 1000 Years"), since "1000 Years" reads as 1000 copies of "Years".
 */
export function parseDeckText(text: string): DeckEntry[] {
    const out: DeckEntry[] = [];
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || line.startsWith("//")) continue;
        const m = /^(\d+)\s*[xX×]\s+(.+)$/.exec(line) ?? /^(\d+)\s+(.+)$/.exec(line);
        addEntry(out, parseName(m ? m[2] : line), m ? Number(m[1]) : 1);
    }
    return out;
}

/** Decks from storage or the panel: ids unique (a new one for a missing or repeated id), names trimmed, amounts 1..99, repeats summed. */
export function cleanDecks(list: unknown, newId: () => string): Deck[] {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.slice(0, MAX_DECKS).map((d: any) => {
        let id = typeof d?.id === "string" && d.id.length > 0 && d.id.length <= 64 ? d.id : "";
        if (!id || seen.has(id)) id = newId();
        seen.add(id);
        const cards: DeckEntry[] = [];
        if (Array.isArray(d?.cards)) for (const c of d.cards) addEntry(cards, parseName(c?.name), typeof c?.count === "number" ? c.count : 0);
        return { id, name: parseName(d?.name) || "Deck", cards };
    });
}

/** The Library cards a Deck would load, matched by name (any case, first card wins), and the names it lists that the Library lacks. */
export function resolveDeck(deck: Deck | undefined, cards: LibCard[]): { cards: { id: string; count: number }[]; missing: string[] } {
    const at = new Map<string, LibCard>();
    for (const c of cards) if (!at.has(key(c.name))) at.set(key(c.name), c);
    const out = { cards: [] as { id: string; count: number }[], missing: [] as string[] };
    for (const e of deck?.cards ?? []) {
        const c = at.get(key(e.name));
        if (c) out.cards.push({ id: c.id, count: e.count });
        else out.missing.push(e.name);
    }
    return out;
}

/** Append a Deck, unless there are no cards or a Deck with that name exists (null): an import never overwrites a Deck the Player may have edited. */
export function addDeck(decks: Deck[], name: string, cards: DeckEntry[], newId: () => string): Deck[] | null {
    if (!cards.length || decks.length >= MAX_DECKS || decks.some((d) => key(d.name) === key(name))) return null;
    return [...decks, { id: newId(), name, cards }];
}
