// Run: node --experimental-strip-types src/state.test.ts
import assert from "node:assert/strict";
import { buildDeck, mulligan, removeById, shuffle, takeTop } from "./state.ts";

let n = 0;
const deck = buildDeck([{ id: "a", count: 3 }, { id: "b", count: 2 }, { id: "c", count: 0 }], () => "i" + n++);
assert.equal(deck.length, 5);
assert.deepEqual(deck.map((c) => c.libId), ["a", "a", "a", "b", "b"]);

const s = shuffle(deck);
assert.equal(s.length, 5);
assert.deepEqual([...s.map((c) => c.iid)].sort(), deck.map((c) => c.iid).sort());
assert.deepEqual(shuffle(deck, () => 0).map((c) => c.iid).length, 5);

assert.deepEqual(takeTop([1, 2, 3], 2), [[1, 2], [3]]);
assert.deepEqual(takeTop([1, 2, 3], 9), [[1, 2, 3], []]);
assert.deepEqual(takeTop([1, 2, 3], -1), [[], [1, 2, 3]]);

const m = mulligan(deck.slice(0, 2), deck.slice(2), 3);
assert.equal(m.hand.length, 3);
assert.equal(m.deck.length, 2);
assert.deepEqual([...m.hand, ...m.deck].map((c) => c.iid).sort(), deck.map((c) => c.iid).sort());

const [got, rest] = removeById(deck, "i1");
assert.equal(got?.iid, "i1");
assert.equal(rest.length, 4);
assert.equal(removeById(deck, "nope")[0], undefined);

console.log("state tests passed");
