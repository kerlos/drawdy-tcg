// Run: node --experimental-strip-types src/deck.test.ts
import assert from "node:assert/strict";
import { addDeck, cleanDecks, parseDeckText, resolveDeck } from "./deck.ts";

let n = 0;
const newId = () => "n" + n++;
const e = (name: string, count: number) => ({ name, count });

// parseDeckText: the formats a Player pastes
assert.deepEqual(parseDeckText("4x cardAName"), [e("cardAName", 4)], "the documented example");
assert.deepEqual(parseDeckText("4X A\n4 x B\n4 C\n4× D\nE"), [e("A", 4), e("B", 4), e("C", 4), e("D", 4), e("E", 1)], "4x, 4 x, 4, 4×, and a bare name is one copy");
assert.deepEqual(parseDeckText("  3x   Spaced   Name  \r\n\r\n"), [e("Spaced   Name", 3)], "outer whitespace and CRLF are ignored");
assert.deepEqual(parseDeckText("# my deck\n// notes\n2x A"), [e("A", 2)], "comment lines are skipped");
assert.deepEqual(parseDeckText("2x Alpha\n3x ALPHA\n1x alpha"), [e("Alpha", 6)], "repeats add up, ignoring case, first spelling wins");
assert.deepEqual(parseDeckText("500x Big"), [e("Big", 99)], "amounts cap at 99");
assert.deepEqual(parseDeckText("0x Gone\n2x Here"), [e("Here", 2)], "0 copies drops the card");
assert.deepEqual(parseDeckText("4xylophone"), [e("4xylophone", 1)], "no space after the amount is part of the name");
assert.deepEqual(parseDeckText("1x 1000 Years\n1000 Years"), [e("1000 Years", 1), e("Years", 99)], "a name that starts with a number needs its amount spelled out");
assert.deepEqual(parseDeckText("2x " + "n".repeat(100))[0].name.length, 80, "names are capped at 80");
assert.deepEqual(parseDeckText(""), []);
assert.equal(parseDeckText(Array.from({ length: 600 }, (_, i) => "c" + i).join("\n")).length, 500, "at most 500 different cards");

// cleanDecks: storage and panel input
const clean = cleanDecks([
    { id: "d1", name: "  Main  ", cards: [e("A", 2), e("a", 3), e("B", 0), e("", 1), { name: "C", count: "9" }, null, e("D", 1e9)] },
    { id: "d1", name: "", cards: "nope" },
    "junk",
    { id: "x".repeat(65), name: "Long id" },
], newId);
assert.deepEqual(clean[0], { id: "d1", name: "Main", cards: [e("A", 5), e("D", 99)] }, "names trimmed, repeats summed, bad entries dropped, amounts capped");
assert.equal(clean[1].name, "Deck", "a blank name becomes Deck");
assert.deepEqual(clean[1].cards, []);
assert.notEqual(clean[1].id, "d1", "a repeated id gets a new one");
assert.equal(clean.length, 4);
assert.ok(clean[2].id && clean[3].id !== "x".repeat(65), "junk gets an id, an overlong id is replaced");
assert.deepEqual(cleanDecks(undefined, newId), []);
assert.deepEqual(cleanDecks({ 0: {} }, newId), []);
assert.equal(cleanDecks(Array.from({ length: 300 }, () => ({})), newId).length, 200, "at most 200 Decks");

// resolveDeck: the Library decides what loads
const cards = [
    { id: "c1", name: "Alpha", count: 0, img: "" },
    { id: "c2", name: "Beta", count: 0, img: "" },
    { id: "c3", name: "alpha", count: 0, img: "" },
];
const deck = { id: "d", name: "D", cards: [e("ALPHA", 3), e("Beta", 1), e("Gamma", 2)] };
assert.deepEqual(resolveDeck(deck, cards), { cards: [{ id: "c1", count: 3 }, { id: "c2", count: 1 }], missing: ["Gamma"] }, "match by name in any case, first card wins, report what is missing");
assert.deepEqual(resolveDeck(undefined, cards), { cards: [], missing: [] }, "no Deck, nothing to load");
assert.deepEqual(resolveDeck(deck, []).missing, ["ALPHA", "Beta", "Gamma"], "an empty Library has none of them");

// addDeck: imports never overwrite
const decks = [{ id: "d1", name: "Main", cards: [e("A", 1)] }];
const added = addDeck(decks, "Starter", [e("A", 2)], newId)!;
assert.deepEqual(added.map((d) => d.name), ["Main", "Starter"]);
assert.equal(decks.length, 1, "the input list is not mutated");
assert.equal(addDeck(decks, "main", [e("A", 2)], newId), null, "a Deck with that name (any case) is left alone");
assert.equal(addDeck(decks, "Empty", [], newId), null, "no cards, no Deck");

console.log("deck tests passed");
