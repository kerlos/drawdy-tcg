// Run: node --experimental-strip-types src/ddc.test.ts
import assert from "node:assert/strict";
import { ddcFileName, decodeDdc, encodeDdc, mergeDdc, type Ddc } from "./ddc.ts";

const A = "data:image/jpeg;base64,/9j/AAAA";
const B = "data:image/png;base64,iVBORw0KGgo=";
const lib = {
    deck: [{ id: "c1", name: "Alpha", count: 3, img: A }, { id: "c2", name: "Beta", count: 2, img: B }],
    tokens: [{ id: "t1", name: "Spirit", count: 1, img: B }],
    customs: [],
};
const file = (o: object) => JSON.stringify({ format: "ddc", version: 1, ...o });
const decode = (o: object) => {
    const r = decodeDdc(file(o));
    assert.ok(r.ok, "decodes");
    return r;
};
const error = (text: string) => {
    const r = decodeDdc(text);
    assert.ok(!r.ok, "rejects");
    return r.error;
};
let n = 0;
const newId = () => "n" + n++;

const text = encodeDdc("  Starter Deck ", lib);
assert.ok(!text.includes('"id"'), "ids are never written");
assert.ok(text.includes('\n "format"'), "indented with one space");
const round = decodeDdc(text);
assert.ok(round.ok);
assert.deepEqual(round.ddc, {
    name: "Starter Deck",
    deck: [{ name: "Alpha", count: 3, img: A }, { name: "Beta", count: 2, img: B }],
    tokens: [{ name: "Spirit", count: 1, img: B }],
    customs: [],
});
assert.equal(round.skipped, 0);

assert.match(error("{nope"), /not JSON/);
assert.match(error("[]"), /not a \.ddc/);
assert.match(error('{"format":"nope","version":1}'), /not a \.ddc/);
assert.match(error('{"format":"ddc"}'), /version/);
assert.match(error('{"format":"ddc","version":"1"}'), /version/);
assert.match(error('{"format":"ddc","version":1.5}'), /version/);
assert.match(error('{"format":"ddc","version":0}'), /version/);
assert.match(error('{"format":"ddc","version":2}'), /newer TCG Tabletop/);
assert.match(error("x".repeat(80_000_001)), /too large/);
assert.match(error(file({ deck: "no" })), /"deck" must be a list/);
assert.match(error(file({ tokens: null })), /"tokens" must be a list/);

const many = (k: number) => Array.from({ length: k }, (_, i) => ({ name: "c" + i, img: A }));
assert.equal(decode({ deck: many(2000) }).ddc.deck.length, 2000, "2000 cards pass");
assert.match(error(file({ deck: many(2001) })), /2000/);
assert.match(error(file({ deck: many(1000), tokens: many(1001) })), /2000/, "the cap is across sections");

const loose = decode({ extra: 1, deck: [{ name: "Alpha", img: A, id: "x", note: "ignored" }] });
assert.deepEqual(loose.ddc, { name: "Cards", deck: [{ name: "Alpha", count: 1, img: A }], tokens: [], customs: [] }, "unknown fields dropped, sections default");
assert.equal(decode({ name: "x".repeat(200) }).ddc.name.length, 80, "deck name capped");
assert.equal(decode({ name: "   " }).ddc.name, "Cards", "blank deck name defaults");

const bad = decode({
    deck: [
        { name: "svg", img: "data:image/svg+xml;base64,PHN2Zz4=" },
        { name: "  ", img: A },
        { name: "b64", img: "data:image/png;base64,@@@" },
        { name: "plain", img: "http://example.com/a.png" },
        { name: 5, img: A },
        { name: "no img" },
        null,
        "str",
        { name: "ok", img: A },
    ],
    tokens: [{ name: "svg2", img: "data:image/svg+xml;base64,PHN2Zz4=" }],
});
assert.equal(bad.skipped, 9, "invalid cards are counted across sections");
assert.deepEqual(bad.ddc.deck.map((c) => c.name), ["ok"], "the file still imports");
assert.equal(decode({ deck: [{ name: "w", img: "data:image/webp;base64,UklGRg==" }, { name: "g", img: "data:image/gif;base64,R0lGOD==" }] }).skipped, 0, "webp and gif are accepted");
assert.equal(decode({ deck: [{ name: "n".repeat(100), img: A }] }).ddc.deck[0].name.length, 80, "card name capped");

const counts = decode({ deck: [
    { name: "a", img: A, count: 500 }, { name: "b", img: A, count: -4 }, { name: "c", img: A, count: 2.9 },
    { name: "d", img: A, count: "5" }, { name: "e", img: A, count: null }, { name: "f", img: A },
    { name: "g", img: A, count: 0 },
] });
assert.deepEqual(counts.ddc.deck.map((c) => c.count), [99, 0, 2, 1, 1, 1, 0], "count clamps to 0..99 and defaults to 1");
const inf = decodeDdc(`{"format":"ddc","version":1,"deck":[{"name":"x","img":"${A}","count":1e999}]}`);
assert.ok(inf.ok && inf.ddc.deck[0].count === 1, "a non-finite count defaults to 1");

const empty: Ddc = { name: "x", deck: [], tokens: [], customs: [] };
const into = mergeDdc(lib, round.ddc, newId);
assert.deepEqual([into.added, into.updated], [0, 0], "importing a Library into itself changes nothing");
assert.deepEqual(into.lib, lib);

const fresh = mergeDdc({ deck: [], tokens: [], customs: [] }, round.ddc, newId);
assert.deepEqual([fresh.added, fresh.updated], [3, 0], "everything is added to an empty Library");
assert.ok(fresh.lib.deck.every((c) => /^n\d+$/.test(c.id)), "ids are regenerated");
assert.deepEqual(fresh.lib.deck.map((c) => [c.name, c.count]), [["Alpha", 3], ["Beta", 2]]);
const again = mergeDdc(fresh.lib, round.ddc, newId);
assert.deepEqual([again.added, again.updated], [0, 0], "second import adds and updates nothing");
assert.deepEqual(again.lib, fresh.lib, "second import leaves the Library unchanged");

const edited: Ddc = { ...empty, deck: [{ name: "Alpha", count: 1, img: A }, { name: "Gamma", count: 4, img: A }], customs: [{ name: "Life", count: 1, img: A }] };
const merged = mergeDdc(lib, edited, newId);
assert.deepEqual([merged.added, merged.updated], [2, 1], "Alpha updated, Gamma and Life added");
assert.equal(merged.lib.deck.find((c) => c.name === "Alpha")!.count, 1, "the file's starter copies win");
assert.equal(merged.lib.deck.find((c) => c.id === "c2")!.count, 2, "cards not in the file are kept");
assert.equal(lib.deck[0].count, 3, "the input Library is not mutated");

const sameCount = mergeDdc(lib, { ...empty, deck: [{ name: "Alpha", count: 3, img: A }] }, newId);
assert.deepEqual([sameCount.added, sameCount.updated], [0, 0], "an unchanged count is not an update");

const newArt = mergeDdc(lib, { ...empty, deck: [{ name: "Alpha", count: 3, img: B }] }, newId);
assert.deepEqual([newArt.added, newArt.updated], [0, 1], "the same name is the same card: a new image is an update");
assert.deepEqual(newArt.lib.deck.filter((c) => c.name === "Alpha").map((c) => [c.id, c.img]), [["c1", B]], "the card keeps its id, so Decks and the menu still find it");
assert.equal(lib.deck[0].img, A, "the input Library is not mutated");

const cased = mergeDdc(lib, { ...empty, deck: [{ name: "ALPHA", count: 3, img: A }] }, newId);
assert.deepEqual([cased.added, cased.updated, cased.lib.deck.length], [0, 0, 2], "names match in any case");
assert.equal(cased.lib.deck[0].name, "Alpha", "and the Library keeps its own spelling");

const starter = mergeDdc(lib, { ...empty, deck: [{ name: "alpha", count: 4, img: A }, { name: "Gamma", count: 0, img: A }, { name: "Beta", count: 1, img: B }, { name: "Alpha", count: 2, img: B }] }, newId);
assert.deepEqual(starter.deck, [{ name: "alpha", count: 6 }, { name: "Beta", count: 1 }], "the starter Deck lists cards with 1+ copies, repeats added, and no images");
assert.deepEqual(mergeDdc(lib, empty, newId).deck, [], "a file without copies has no starter Deck");
assert.deepEqual(mergeDdc(lib, { ...empty, tokens: [{ name: "Spirit", count: 5, img: B }] }, newId).deck, [], "tokens are never part of a Deck");

const sections = mergeDdc(lib, { ...empty, tokens: [{ name: "Alpha", count: 1, img: A }] }, newId);
assert.equal(sections.added, 1, "cards only match within their own section");

const dupes: Ddc = { ...empty, deck: [{ name: "Alpha", count: 3, img: A }, { name: "Alpha", count: 1, img: A }] };
const dupeRun = mergeDdc({ deck: [], tokens: [], customs: [] }, dupes, newId);
assert.deepEqual(dupeRun.lib.deck.map((c) => [c.name, c.count]), [["Alpha", 4]], "a card listed twice in one file adds up");
assert.deepEqual([dupeRun.added, dupeRun.updated], [1, 0]);
assert.deepEqual(mergeDdc(dupeRun.lib, dupes, newId).lib, dupeRun.lib, "and stays unchanged on a second import");

assert.equal(ddcFileName("Test Deck"), "test-deck.ddc");
assert.equal(ddcFileName("  --Starter!! Deck #2--  "), "starter-deck-2.ddc");
assert.equal(ddcFileName(""), "cards.ddc");
assert.equal(ddcFileName("!!!"), "cards.ddc");

console.log("ddc tests passed");
