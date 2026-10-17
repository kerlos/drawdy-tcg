// End-to-end check of the built driver against an in-memory fake Drawdy host with two Players.
// Run: npm run build && node test/driver.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MAIN = fileURLToPath(new URL("../dist/main.js", import.meta.url));

globalThis.OffscreenCanvas = class {
    getContext() {
        return new Proxy({}, { get: (_, k) => (k === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => {}) });
    }
    async convertToBlob(o) {
        // noWebp mimics a browser (Safari) that answers a WebP request with PNG.
        const type = globalThis.noWebp && o?.type === "image/webp" ? "image/png" : (o?.type ?? "image/png");
        return new Blob(["cardback"], { type });
    }
};
const sized = (width, height) => {
    globalThis.createImageBitmap = async () => ({ width, height, close() {} });
};
sized(388, 528);

// ---- fake host ----
const scene = new Map(); // id -> element (shared)
const drivers = {};
let idn = 0;

const pick = (e, props) => ({ id: e.id, ...Object.fromEntries((props ?? Object.keys(e)).filter((k) => k in e).map((k) => [k, e[k]])) });
const hits = (e, r) => {
    const w = e.width ?? 0, h = e.height ?? 0;
    return e.x <= r.x + r.width && e.x + w >= r.x && e.y <= r.y + r.height && e.y + h >= r.y;
};

function makeHost(name, userId) {
    const kv = new Map();
    const previews = new Map();
    const posted = [];
    const h = { name, userId, kv, previews, posted, mod: null };
    h.issue = async ({ type, req }) => {
        const ok = (value) => ({ res: { value } });
        const fail = (message) => ({ res: { error: { type: "bad-argument", message } } });
        const touch = () => {
            for (const d of Object.values(drivers)) d.mod.onEvent({ type: "subscription:scene:elements-updated", body: {} });
        };
        switch (type) {
            case "command:scene:add-drawdy-elements": {
                if (req.elements.some((e) => scene.has(e.drawdyElementId))) return fail("exists");
                for (const e of req.elements) scene.set(e.drawdyElementId, { ...e, id: e.drawdyElementId, meta: e.meta ?? {} });
                touch();
                return ok({});
            }
            case "command:scene:remove-drawdy-elements":
                req.drawdyElementIds.forEach((i) => scene.delete(i));
                touch();
                return ok({});
            case "command:scene:update-drawdy-elements":
                for (const { drawdyElementId, properties } of req.updates) {
                    const e = scene.get(drawdyElementId);
                    if (!e) continue;
                    const { meta, transform, ...rest } = properties;
                    Object.assign(e, rest, { meta: { ...e.meta, ...meta } });
                    if (transform) Object.assign(e, transform);
                }
                touch();
                return ok({});
            case "command:scene:get-drawdy-elements":
                return ok({ drawdyElements: req.drawdyElementIds.filter((i) => scene.has(i)).map((i) => pick(scene.get(i), req.properties)) });
            case "command:scene:query-rect":
                return ok({ drawdyElements: [...scene.values()].filter((e) => hits(e, req.rect)).map((e) => pick(e, req.properties)) });
            case "command:scene:element-rects":
                return ok({ rects: req.drawdyElementIds.map((i) => ({ drawdyElementId: i, rect: pick(scene.get(i), ["x", "y", "width", "height"]) })) });
            case "command:scene:get-current-selected-drawdy-elements":
                return ok({ drawdyElementIds: h.selected ?? [] });
            case "command:scene:get-image-source":
                return ok({ blob: scene.get(req.drawdyElementId).blob });
            case "command:scene:create-drawdy-preview-elements": {
                const previewId = `pv${idn++}`;
                previews.set(previewId, req.elements[0]);
                return ok({ previewId });
            }
            case "command:scene:update-drawdy-preview-elements":
                previews.set("pv0", req.elements[0]);
                return ok({});
            case "command:scene:delete-drawdy-preview-elements":
                req.previewIds.forEach((i) => previews.delete(i));
                return ok({});
            case "command:kv-storage:get":
                return ok({ got: kv.get(req.key) });
            case "command:kv-storage:set":
                if (h.failKv) return fail("quota");
                kv.set(req.key, structuredClone(req.payload));
                return ok({});
            case "command:kv-storage:delete":
                kv.delete(req.key);
                return ok({});
            case "command:collaboration:get-all-users-in-board":
                return ok({ users: Object.values(drivers).map((d) => ({ id: d.userId, name: d.name, isSelf: d === h })) });
            case "command:webview:create":
                return ok({ created: true });
            case "command:webview:post-message":
                posted.push(structuredClone(req.message));
                return ok({ posted: true });
            default:
                return ok({});
        }
    };
    h.state = () => [...posted].reverse().find((m) => m.t === "state");
    h.send = (message) => h.mod.onEvent({ type: "subscription:webview:message", body: { webviewDomId: "tcg-panel", message } });
    h.act = (a, extra = {}) => h.send({ t: "act", a, n: 0, ...extra });
    return h;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = () => sleep(500);

async function boot(name, userId, seed) {
    const mod = {}; // fresh module state per Player
    new Function("exports", readFileSync(MAIN, "utf8"))(mod);
    const h = makeHost(name, userId);
    h.mod = mod;
    drivers[userId] = h;
    seed?.(h); // what this device already stored before the driver starts
    await mod.activate({ issueCommand: h.issue, manifest: { driverId: "kerlo.drawdy-tcg" }, generateId: () => `x${idn++}` });
    return h;
}

const img = "data:image/png;base64,iVBORw0KGgo=";
const lastOf = (h, t) => [...h.posted].reverse().find((m) => m.t === t);
const deckOf = (m) => m.lib.deck.map((c) => [c.name, c.count]);
const importOn = async (h, file, text) => {
    h.send({ t: "ddcImport", file, text });
    await settle();
    return lastOf(h, "note").text;
};
// The Library is filled from .ddc files: this one holds Alpha x3, Beta x2 and a Spirit token, so it also makes the Deck "Seed".
const seed = JSON.stringify({
    format: "ddc", version: 1, name: "Seed",
    deck: [{ name: "Alpha", count: 3, img }, { name: "Beta", count: 2, img }],
    tokens: [{ name: "Spirit", count: 1, img }],
});

// ---- scenario ----
const A = await boot("Ann", "ua");
const B = await boot("Bob", "ub");
await settle();

assert.equal(await importOn(A, "seed.ddc", seed), 'Imported "Seed": 3 added, 0 updated. Deck "Seed" created.', "A fills the Library from a file");
await importOn(B, "seed.ddc", seed);
assert.equal(A.state().deckSize, 5, "the new Deck is chosen, so it is ready to play");

A.act("claim", { seat: 1 });
await settle();
B.act("claim", { seat: 2 });
await settle();
assert.equal(A.state().seat, 1, "A holds Side 1");
assert.equal(B.state().seat, 2, "B holds Side 2");
assert.equal(A.state().deck.length, 5, "A deck loaded");
assert.equal(B.state().seats[1].name, "Ann", "B sees A seated");

// Draw: the Hand stays private
A.act("draw", { n: 2 });
await settle();
assert.equal(A.state().hand.length, 2, "A drew 2");
assert.equal(B.state().seats[1].hand, 2, "B sees only the hand count");
assert.equal(B.state().hand.length, 0, "B has no hand");
const sceneJson = () => JSON.stringify([...scene.values()].map((e) => ({ ...e, blob: undefined })));
assert.ok(!sceneJson().includes("Alpha") && !sceneJson().includes("Beta"), "no card names leaked to the scene");
assert.ok(![...scene.values()].some((e) => e.meta?.iid), "no instance ids in the scene");

// Play a card face-up, then the Mirror shows it to B
const first = A.state().hand[0];
A.send({ t: "act", a: "move", n: 0, iid: first.iid, from: "hand", to: "play" });
await settle();
const played = [...scene.values()].filter((e) => e.meta?.tcg === "card");
assert.equal(played.length, 1, "one card on the table");
assert.equal(played[0].meta.owner, 1);
assert.equal(A.state().hand.length, 1);
const mirror = [...B.previews.values()][0];
assert.ok(mirror, "B has a Mirror preview");
const svg = Buffer.from(mirror.schema.child.split(",")[1], "base64").toString();
assert.ok(svg.includes("<image") && svg.includes("rotate(180"), "Mirror draws the card rotated 180 degrees");

// Face-down + tap through the menu path
A.selected = [played[0].id];
A.mod.onEvent({ type: "subscription:context-menu:clicked", body: { menuId: "tcg:flip" } });
await settle();
const flipped = [...scene.values()].find((e) => e.meta?.tcg === "card");
assert.equal(flipped.meta.faceDown, true, "flip makes it face-down");
assert.ok(!flipped.meta.name, "face-down card hides its name");
A.selected = [flipped.id];
A.mod.onEvent({ type: "subscription:context-menu:clicked", body: { menuId: "tcg:tap" } });
await settle();
assert.equal([...scene.values()].find((e) => e.meta?.tcg === "card").meta.tapped, true, "tap recorded in meta");

// Show Hand: only face-up copies while on
A.act("toggleShown", { on: true });
await settle();
assert.equal([...scene.values()].filter((e) => e.meta?.tcg === "shown").length, 1, "shown hand copy on the table");
A.act("toggleShown", { on: false });
await settle();
assert.equal([...scene.values()].filter((e) => e.meta?.tcg === "shown").length, 0, "hand hidden again");

// Peek is private, Reveal is public
A.act("peek", { n: 2 });
await settle();
assert.equal(A.state().held.mode, "peek");
assert.equal([...scene.values()].filter((e) => e.meta?.tcg === "reveal").length, 0, "peek puts nothing on the table");
assert.ok(B.state().log.some((l) => l.seat === 1 && /looked at the top 2/.test(l.text)), "B is told A peeked");
A.act("closeHeld");
A.act("reveal", { n: 1 });
await settle();
assert.equal([...scene.values()].filter((e) => e.meta?.tcg === "reveal").length, 1, "reveal is public");
A.act("closeHeld");
await settle();
assert.equal(A.state().deck.length, 3, "closing the look returns the cards to the top");

// Token via right-click menu
const spiritId = lastOf(A, "lib").lib.tokens.find((c) => c.name === "Spirit").id;
A.mod.onEvent({ type: "subscription:context-menu:clicked", body: { menuId: `tcg:token:${spiritId}` } });
await settle();
assert.ok([...scene.values()].some((e) => e.meta?.kind === "token"), "token added");

// Drag a card onto the Discard zone (snaps in, listed as public) and onto the Deck zone (asks top/bottom)
const drag = async (id, zoneId) => {
    const z = scene.get(zoneId);
    Object.assign(scene.get(id), { x: z.x + z.width / 2 - 52, y: z.y + z.height / 2 - 70 });
    A.mod.onEvent({ type: "subscription:scene:drawdy-elements-dragged", body: { type: "dragMove", drawdyElementIds: [id] } });
    A.mod.onEvent({ type: "subscription:scene:drawdy-elements-dragged", body: { type: "dragEnd", drawdyElementIds: [id] } });
    await settle();
};
const handNow = A.state().hand;
A.send({ t: "act", a: "move", n: 0, iid: handNow[0].iid, from: "hand", to: "play" });
await settle();
const dragged = [...scene.values()].find((e) => e.meta?.tcg === "card" && e.meta.kind === "card" && e.meta.name && !e.meta.tapped);
await drag(dragged.id, "tcg-zone-discard-1");
assert.equal(A.state().discard.mine.length, 1, "card in Discard Pile");
assert.equal(B.state().discard.opp.length, 1, "B can see A's Discard Pile");
A.act("draw", { n: 1 });
await settle();
A.send({ t: "act", a: "move", n: 0, iid: A.state().hand[0].iid, from: "hand", to: "play" });
await settle();
const toDeck = [...scene.values()].find((e) => e.meta?.tcg === "card" && e.meta.kind === "card" && e.meta.name && !e.meta.tapped && e.id !== dragged.id);
const deckBefore = A.state().deck.length;
await drag(toDeck.id, "tcg-zone-deck-1");
assert.equal(A.state().drop, true, "asked where to put the card");
A.act("dropDeck", { to: "bottom" });
await settle();
assert.equal(A.state().deck.length, deckBefore + 1, "card went back into the Deck");

// A new device is stale until a Restart
const A2 = await boot("Ann", "ua");
await settle();
A2.act("claim", { seat: 1 });
await settle();
assert.equal(A2.state().status, "stale", "new device cannot resume the Match");
delete drivers.ua;
drivers.ua = A;

// Restart: B asks, A accepts, both Sides reset
B.act("restartRequest");
await settle();
assert.equal(A.state().restart, 2, "A sees the request");
A.act("restartAccept");
await settle();
await settle();
assert.equal(A.state().matchNo, 2);
assert.equal(B.state().matchNo, 2);
assert.equal(A.state().hand.length, 0);
assert.equal(A.state().deck.length, 5, "fresh deck after Restart");
assert.equal([...scene.values()].filter((e) => e.meta?.tcg === "card" || e.meta?.kind === "token").length, 0, "tables cleared");

// B cannot act on A's Side: B's table cards are owned by seat 2 only
B.act("draw", { n: 1 });
await settle();
assert.equal(B.state().hand.length, 1);
assert.equal(A.state().hand.length, 0, "A's hand untouched");

A.send({ t: "ddcExport", name: "Test Deck" });
await settle();
const exported = lastOf(A, "ddcFile");
assert.equal(exported.file, "test-deck.ddc", "file name comes from the deck name");
assert.equal(exported.cards, 3, "export counts card entries");
const ddc = JSON.parse(exported.text);
assert.equal(ddc.format, "ddc");
assert.equal(ddc.version, 1);
assert.ok(Array.isArray(ddc.deck) && Array.isArray(ddc.tokens) && Array.isArray(ddc.customs), "all three sections are written");
assert.ok([...ddc.deck, ...ddc.tokens, ...ddc.customs].every((c) => !("id" in c)), "no card carries an id");
assert.ok(!exported.text.includes('"id"'), "no id anywhere in the file text");
assert.deepEqual(ddc.deck.map((c) => [c.name, c.count]), [["Alpha", 3], ["Beta", 2]], "deck holds Alpha x3 and Beta x2");
assert.deepEqual(ddc.tokens.map((c) => c.name), ["Spirit"], "tokens are exported too");

const C = await boot("Cy", "uc");
await settle();
C.send({ t: "ddcExport", name: "Empty" });
await settle();
assert.equal(lastOf(C, "note").text, "Nothing to export yet.", "an empty Library has nothing to export");
assert.ok(!lastOf(C, "ddcFile"), "no file is posted for an empty Library");

assert.equal(await importOn(C, "test-deck.ddc", exported.text), 'Imported "Test Deck": 3 added, 0 updated. Deck "Test Deck" created.', "first import adds every card and the Deck the file lists");
const imported = lastOf(C, "lib");
assert.deepEqual(deckOf(imported), [["Alpha", 3], ["Beta", 2]], "C holds the same deck names and counts");
assert.deepEqual(imported.lib.tokens.map((c) => c.name), ["Spirit"], "C holds the token");
const cards = [...imported.lib.deck, ...imported.lib.tokens, ...imported.lib.customs];
assert.ok(cards.every((c) => !["c1", "c2", "t1"].includes(c.id)), "ids are regenerated on import");
assert.ok(cards.every((c) => c.img.startsWith("data:image/webp")), "images are re-fitted to WebP");
assert.equal(C.kv.get("lib-deck").list.length, 2, "the import is persisted");

assert.equal(await importOn(C, "test-deck.ddc", exported.text), 'Imported "Test Deck": 0 added, 0 updated. A Deck named "Test Deck" already exists, so it was left alone.', "second import changes nothing");
assert.deepEqual(lastOf(C, "lib").lib, imported.lib, "card lists unchanged by the second import");

const bad = await importOn(C, "bad.ddc", '{"format":"nope"}');
assert.ok(bad.startsWith("bad.ddc: ") && /not a \.ddc/.test(bad), "a rejected file names itself and the reason");
assert.deepEqual(lastOf(C, "lib").lib, imported.lib, "a rejected file leaves the Library alone");

const mixed = { format: "ddc", version: 1, name: "Mixed", deck: [{ name: "Gamma", count: 1, img }, { name: "Evil", count: 1, img: "data:image/svg+xml;base64,PHN2Zz4=" }] };
assert.equal(await importOn(C, "mixed.ddc", JSON.stringify(mixed)), 'Imported "Mixed": 1 added, 0 updated, 1 skipped. Deck "Mixed" created.', "an svg card is skipped, the rest imports");
assert.deepEqual(deckOf(lastOf(C, "lib")).map(([n]) => n), ["Alpha", "Beta", "Gamma"]);

const decodeBitmap = globalThis.createImageBitmap;
globalThis.createImageBitmap = async () => {
    throw new Error("undecodable");
};
const broken = { format: "ddc", version: 1, name: "Broken", deck: [{ name: "Delta", count: 1, img }] };
assert.equal(await importOn(C, "broken.ddc", JSON.stringify(broken)), 'Imported "Broken": 0 added, 0 updated, 1 skipped.', "an image that will not decode is skipped");
globalThis.createImageBitmap = decodeBitmap;
assert.ok(!deckOf(lastOf(C, "lib")).some(([n]) => n === "Delta"), "the undecodable card is not in the Library");

C.failKv = true;
const doomed = { format: "ddc", version: 1, name: "Doomed", deck: [{ name: "Omega", count: 1, img }] };
assert.match(await importOn(C, "doomed.ddc", JSON.stringify(doomed)), /^doomed\.ddc: import failed \(.*quota/, "a storage failure still posts a note so the panel never hangs");
C.failKv = false;

const extra = { format: "ddc", version: 1, name: "Extra", deck: [{ name: "Gamma", count: 1, img }] };
assert.equal(await importOn(A, "extra.ddc", JSON.stringify(extra)), 'Imported "Extra": 1 added, 0 updated. Deck "Extra" created.', "A imports during a Match");
assert.equal(A.state().deckSize, 5, "the chosen Deck is still Seed");
assert.equal(A.state().deck.length, 5, "the running Deck is not reloaded");
assert.equal(A.state().matchNo, 2, "the Match is untouched");

// Card image format: 388x528 WebP; exact-size WebP/JPEG is kept, older sizes are upgraded, no WebP encoder falls back to JPEG.
const keepWebp = "data:image/webp;base64,S0VFUA==";
const keepJpeg = "data:image/jpeg;base64,S0VFUDI=";
const fileOf = (name, deck) => JSON.stringify({ format: "ddc", version: 1, name, deck });
const imgOf = (h, name) => lastOf(h, "lib").lib.deck.find((c) => c.name === name).img;
await importOn(C, "keep.ddc", fileOf("Keep", [{ name: "KeepWebp", count: 1, img: keepWebp }, { name: "KeepJpeg", count: 1, img: keepJpeg }]));
assert.equal(imgOf(C, "KeepWebp"), keepWebp, "an exact 388x528 WebP is kept as is");
assert.equal(imgOf(C, "KeepJpeg"), keepJpeg, "an exact 388x528 JPEG is kept as is");
sized(252, 352);
const legacy = "data:image/jpeg;base64,TEVHQUNZ";
await importOn(C, "old.ddc", fileOf("Old", [{ name: "Legacy", count: 1, img: legacy }, { name: "LegacyPng", count: 1, img }]));
assert.equal(imgOf(C, "Legacy"), legacy, "a 252x352 JPEG from an older Library is kept as is, so a Library re-imports its own export unchanged");
assert.ok(imgOf(C, "LegacyPng").startsWith("data:image/webp"), "any other 252x352 image is re-fitted to 388x528 WebP");
assert.equal(await importOn(C, "old.ddc", fileOf("Old", [{ name: "Legacy", count: 1, img: legacy }])), 'Imported "Old": 0 added, 0 updated. A Deck named "Old" already exists, so it was left alone.', "importing the legacy card again changes nothing");
sized(388, 528);
globalThis.noWebp = true;
await importOn(C, "safari.ddc", fileOf("Safari", [{ name: "NoEncoder", count: 1, img }]));
assert.ok(imgOf(C, "NoEncoder").startsWith("data:image/jpeg"), "without a WebP encoder the card falls back to JPEG");
globalThis.noWebp = false;

// ---- Decks ----
const decksOf = (h) => lastOf(h, "decks");
const pushes = (h) => h.posted.filter((m) => m.t === "decks").length;
B.act("release");
await settle();
const D = await boot("Di", "ud");
await settle();
D.send({ t: "ready" });
await settle();
assert.deepEqual(decksOf(D).list, [], "a new install has no Decks");
D.act("claim", { seat: 2 });
await settle();
assert.equal(D.state().seat, 2);
assert.equal(D.state().deck.length, 0, "no Deck, so nothing loads at the start");

await importOn(D, "seed.ddc", seed);
const seedDeck = decksOf(D).list[0];
assert.deepEqual(seedDeck.cards, [{ name: "Alpha", count: 3 }, { name: "Beta", count: 2 }], "the Deck holds names and amounts, no images");
assert.equal(decksOf(D).active, seedDeck.id, "the first Deck is chosen");
assert.deepEqual(D.kv.get("decks"), { list: decksOf(D).list, active: seedDeck.id }, "Decks are persisted");
assert.ok(!JSON.stringify(D.kv.get("decks")).includes("data:"), "no image is stored in a Deck");
D.act("loadDeck");
await settle();
assert.equal(D.state().deck.length, 5, "Load Deck builds the chosen Deck");
D.act("loadDeck");
await settle();
assert.equal(D.state().msg, "Restart the Match to rebuild the Deck.", "a loaded Deck is not loaded twice");

// create and choose a Deck from the panel; names match in any case
const mine = { id: "p1", name: "Mine", cards: [{ name: "alpha", count: 4 }] };
let before = pushes(D);
D.send({ t: "decks", list: [seedDeck, mine], active: "p1" });
await settle();
assert.equal(D.state().deckSize, 4, "alpha finds Alpha");
assert.equal(D.kv.get("decks").active, "p1");
assert.equal(pushes(D), before, "an unchanged list is not echoed back");

// update by text: names and amounts, unknown names are kept and reported
D.send({ t: "deckText", id: "p1", text: "# my deck\n2x Alpha\n1 beta\nGamma\n1x Nope\n" });
await settle();
assert.deepEqual(decksOf(D).list.find((d) => d.id === "p1").cards, [{ name: "Alpha", count: 2 }, { name: "beta", count: 1 }, { name: "Gamma", count: 1 }, { name: "Nope", count: 1 }]);
assert.equal(lastOf(D, "note").text, 'Updated "Mine": 5 cards. Not in your Library yet: Gamma, Nope.');
assert.equal(D.state().deckSize, 3, "only cards the Library has are loaded");
D.send({ t: "deckText", id: "nope", text: "1x Alpha" });
D.send({ t: "deckText", id: "p1", text: 5 });
await settle();
assert.equal(decksOf(D).list.find((d) => d.id === "p1").cards.length, 4, "text for an unknown Deck or not text is ignored");

// the chosen Deck loads when the next Match starts
D.act("restartRequest");
await settle();
A.act("restartAccept");
await settle();
await settle();
assert.equal(D.state().deck.length, 3, "Restart loads the chosen Deck, not the first one");

// a bad list is cleaned and answered; deleting the chosen Deck falls back to the first
before = pushes(D);
D.send({ t: "decks", list: [seedDeck, { id: "", name: "  Spaced  ", cards: [{ name: "Alpha", count: 500 }, { name: "", count: 1 }] }, "junk"], active: "gone" });
await settle();
assert.equal(pushes(D), before + 1, "a cleaned list is echoed back");
assert.deepEqual(decksOf(D).list.slice(1).map((d) => [d.name, d.cards]), [["Spaced", [{ name: "Alpha", count: 99 }]], ["Deck", []]]);
assert.equal(decksOf(D).active, seedDeck.id, "an unknown choice falls back to the first Deck");
assert.equal(D.state().deckSize, 5);
D.send({ t: "decks", list: [], active: "" });
await settle();
assert.equal(D.state().deckSize, 0, "no Decks, nothing to load");
assert.equal(D.kv.get("decks").list.length, 0);

// the old Deck List becomes a Deck once; deleting every Deck is not undone on the next start
const legacyKv = (h) => h.kv.set("lib-deck", { list: [{ id: "o1", name: "Old One", count: 2, img }, { id: "o2", name: "Old Two", count: 0, img }, { id: "o3", name: "old one", count: 1, img }] });
const E = await boot("Eve", "ue", legacyKv);
E.send({ t: "ready" });
await settle();
const migrated = decksOf(E);
assert.deepEqual(migrated.list.map((d) => [d.name, d.cards]), [["My Deck", [{ name: "Old One", count: 3 }]]], "counts on old cards become a Deck, repeats added");
assert.equal(migrated.active, migrated.list[0].id);
assert.equal(E.state().deckSize, 3);
assert.deepEqual(E.kv.get("decks").list, migrated.list, "and is saved");
E.send({ t: "decks", list: [], active: "" });
await settle();
const restart = (h) => (x) => [...h.kv].forEach(([k, v]) => x.kv.set(k, v));
const E2 = await boot("Eve", "ue", restart(E));
E2.send({ t: "ready" });
await settle();
assert.deepEqual(decksOf(E2).list, [], "deleted Decks do not come back from the old Deck List");

// Creator draft: kept across restarts, exported or added to the Library like a file
E2.send({ t: "draft", kind: "deck", list: [{ id: "d1", name: "Zed", count: 2, img }] });
E2.send({ t: "draftName", name: "Zed Set" });
E2.send({ t: "draft", kind: "__proto__", list: [] });
E2.send({ t: "draft", kind: "tokens", list: "nope" });
await settle();
assert.ok(![...E2.kv.keys()].some((k) => /__proto__|^draft-tokens$/.test(k)), "a bad kind or list is ignored");
const E3 = await boot("Eve", "ue", restart(E2));
E3.send({ t: "ready" });
await settle();
assert.deepEqual([lastOf(E3, "draft").draft.deck.map((c) => c.name), lastOf(E3, "draft").name], [["Zed"], "Zed Set"], "the draft survives a restart");
E3.send({ t: "ddcExport", from: "draft", name: "Zed Set" });
await settle();
const draftFile = lastOf(E3, "ddcFile");
assert.deepEqual([draftFile.from, draftFile.file, draftFile.cards], ["draft", "zed-set.ddc", 1], "the draft exports under its own name");
assert.equal(JSON.parse(draftFile.text).deck[0].count, 2, "starter copies are written");
E3.send({ t: "ddcExport", from: "lib", name: "x" });
await settle();
assert.deepEqual(JSON.parse(lastOf(E3, "ddcFile").text).deck.map((c) => c.name), ["Old One", "Old Two", "old one"], "the Library export holds the Library, not the draft");
E3.send({ t: "draftUse", name: "Zed Set" });
await settle();
assert.equal(lastOf(E3, "note").text, 'Imported "Zed Set": 1 added, 0 updated. Deck "Zed Set" created.', "Add to my Library works like importing the file");
assert.deepEqual(deckOf(lastOf(E3, "lib")).at(-1), ["Zed", 2], "Zed joins the Library");
assert.deepEqual(decksOf(E3).list.map((d) => [d.name, d.cards]), [["Zed Set", [{ name: "Zed", count: 2 }]]]);
assert.equal(E3.state().deckSize, 2);
E3.send({ t: "draft", kind: "deck", list: [] });
E3.send({ t: "draftUse", name: "Empty" });
await settle();
assert.equal(lastOf(E3, "note").text, "Add some cards first.", "an empty draft has nothing to add");

console.log("driver.test.mjs: all checks passed");
process.exit(0);
