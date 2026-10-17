import type { DriverCommandIssuer, DriverModule } from "@drawdy/driver-protocol";
import { makeCardBack } from "./cardback";
import { ddcFileName, decodeDdc, encodeDdc, mergeDdc, type Ddc } from "./ddc";
import { addDeck, cleanDecks, parseDeckText, resolveDeck } from "./deck";
import {
    CARD_H,
    CARD_W,
    H,
    W,
    bothSidesRect,
    cameraRect,
    centerIn,
    mirrorRect,
    other,
    revealPos,
    shownPos,
    sideRect,
    sideX,
    spawnPos,
    zoneRect,
    zoneSlot,
    type Rect,
    type Seat,
    type ZoneName,
} from "./geometry";
import { mirrorSvg, type MEl } from "./mirror";
import { PANEL_HTML } from "./panel";
import { buildDeck, mulligan, removeById, shuffle, takeTop, type Inst } from "./state";
import type { Board, Deck, Lib, LibCard, LibKind, Local, LogEntry, PanelState, TableCard } from "./types";
import { blobToDataUrl, dataUrlToBlob, fitCard, svgToDataUrl } from "./util";

// ---------- ids and constants ----------
const ID = {
    match: "tcg-match",
    seat: (s: Seat) => `tcg-seat-${s}`,
    log: (s: Seat) => `tcg-log-${s}`,
    side: (s: Seat) => `tcg-side-${s}`,
    zone: (s: Seat, z: ZoneName) => `tcg-zone-${z}-${s}`,
    count: (s: Seat, z: ZoneName) => `tcg-count-${z}-${s}`,
    pile: (s: Seat) => `tcg-pile-${s}`,
    mirror: "tcg-mirror",
};
const WEBVIEW = "tcg-panel";
const BUTTON = "tcg-open";
const GRAY = "#9aa0aa";
const SEATS: Seat[] = [1, 2];
const KINDS: LibKind[] = ["deck", "tokens", "customs"];
const MENU_LEAVES = [
    "tcg:flip", "tcg:tap", "tcg:peekcard", "tcg:discard", "tcg:tohand", "tcg:ptop", "tcg:pbottom", "tcg:remove",
    "tcg:draw", "tcg:shuffle", "tcg:mulligan", "tcg:search", "tcg:peek", "tcg:reveal", "tcg:hand",
];

// ponytail: privacy is "never sync private state", not encryption; a modified client could still read raw board data.
// ---------- driver state ----------
let issue: DriverCommandIssuer;
let driverId = "";
let newId: () => string;
let seq = 0;

let me = { id: "", name: "Player" };
let users: { id: string; name: string; isSelf: boolean }[] = [];
let lib: Lib = { deck: [], tokens: [], customs: [] };
let decks: Deck[] = [];
let activeDeck = ""; // id of the Deck that loads when a Match starts or on Load Deck
// The Creator's work in progress: a Library-shaped draft that is exported as a .ddc or added to the Library.
let draft: Lib = { deck: [], tokens: [], customs: [] };
let draftName = "";
let local: Local | null = null;
let saved: Local | null = null; // what this device remembered from last time
let board: Board = { n: 0, req: null, seats: { 1: null, 2: null }, logs: { 1: [], 2: [] } };
let back: { blob: Blob; url: string };
let seenN = 0;
let flashMsg = "";
let lastN = 1;
let lastPtr = { x: 0, y: 0 };
let pendingDrop: string | null = null;
let lookCard: string | null = null;
let discardView: PanelState["discard"] = { mine: [], opp: [] };
let lastCounts: { deck: number; discard: number; hand: number } | null = null;
let shownSig = "";
let mirrorPreview: string | null = null;
let mirrorLast = "";
const dragIds = new Set<string>();
const imgCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();
const subscribedMenus = new Set<string>();
let chain: Promise<unknown> = Promise.resolve();
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const enqueue = (fn: () => Promise<unknown>) => {
    chain = chain.then(fn).catch((e) => flash(String(e instanceof Error ? e.message : e)));
    return chain;
};

// ---------- protocol helpers ----------
async function cmd<T = any>(type: string, req?: unknown): Promise<T> {
    const r: any = await issue({ type, driverId, requestId: String(seq++), ...(req === undefined ? {} : { req }) } as any);
    if (r.res.error) throw new Error(`${type}: ${r.res.error.message ?? r.res.error.type}`);
    return r.res.value as T;
}
const add = (elements: any[]) => cmd("command:scene:add-drawdy-elements", { elements });
const rm = (ids: string[]) => (ids.length ? cmd("command:scene:remove-drawdy-elements", { drawdyElementIds: ids }) : null);
const upd = (updates: { drawdyElementId: string; properties: any }[]) =>
    updates.length ? cmd("command:scene:update-drawdy-elements", { updates }) : null;
const getEls = async (ids: string[], properties: string[]): Promise<any[]> =>
    (await cmd("command:scene:get-drawdy-elements", { properties, drawdyElementIds: ids })).drawdyElements;
const queryRect = async (rect: Rect, properties: string[]): Promise<any[]> =>
    (await cmd("command:scene:query-rect", { rect, properties })).drawdyElements;
const kvSet = (key: string, payload: unknown) => cmd("command:kv-storage:set", { key, payload });
const kvGet = async (key: string): Promise<any> => (await cmd("command:kv-storage:get", { key })).got;
const lockIds = (ids: string[]) => upd(ids.map((id) => ({ drawdyElementId: id, properties: { locked: true } })));

function flash(msg: string) {
    flashMsg = msg;
    pushState();
    setTimeout(() => {
        if (flashMsg === msg) {
            flashMsg = "";
            pushState();
        }
    }, 6000);
}

// ---------- who am I ----------
const online = (userId: string) => users.some((u) => u.id === userId);
const mySeat = (): Seat | null => SEATS.find((s) => board.seats[s]?.userId === me.id && me.id !== "") ?? null;
const active = (): Local | null => {
    const s = mySeat();
    return s && local && local.seat === s ? local : null;
};
const libCard = (id: string): LibCard | undefined =>
    [...lib.deck, ...lib.tokens, ...lib.customs].find((c) => c.id === id);

// ---------- the shared board: statics, seats, match, log ----------
function staticEls(): any[] {
    const els: any[] = [{ type: "text", drawdyElementId: ID.match, x: W + 40, y: 20, text: "Match 1", fontSize: 20, color: GRAY, meta: { tcg: "match", n: 1, req: null } }];
    for (const s of SEATS) {
        els.push({
            type: "shape", drawdyElementId: ID.side(s), x: sideX(s), y: 0, width: W, height: H,
            strokeColor: "#888888", fillColor: "rgba(128,128,128,0.05)", strokeWidth: 2, strokeDash: "dashed", roughness: 0, cornerRadius: 24,
        });
        for (const z of ["deck", "discard"] as ZoneName[]) {
            const r = zoneRect(s, z);
            els.push({
                type: "shape", drawdyElementId: ID.zone(s, z), x: r.x, y: r.y, width: r.width, height: r.height,
                strokeColor: "#888888", fillColor: "rgba(128,128,128,0.08)", strokeWidth: 2, strokeDash: "dashed", roughness: 0, cornerRadius: 10,
                text: z === "deck" ? "Deck" : "Discard", textVerticalAlign: "top", textColor: GRAY, fontSize: 14,
            });
        }
    }
    return els;
}

async function ensureBoard() {
    const els = staticEls();
    const have = new Set((await getEls(els.map((e) => e.drawdyElementId), ["meta"])).map((e) => e.id));
    const missing = els.filter((e) => !have.has(e.drawdyElementId));
    if (!missing.length) return;
    try {
        await add(missing);
        await lockIds(missing.filter((e) => e.type === "shape").map((e) => e.drawdyElementId));
    } catch {
        // the other Player created them first
    }
}

async function upsertText(id: string, x: number, y: number, text: string, meta: Record<string, unknown>, fontSize = 16) {
    await rm([id]);
    await add([{ type: "text", drawdyElementId: id, x, y, text, fontSize, color: GRAY, meta }]);
}

const seatLabel = (s: Seat, name: string, hand: number, deck: number) => `Player ${s} - ${name}    Hand ${hand}  Deck ${deck}`;
const seatMeta = (s: Seat, i: { userId: string; name: string; hand: number; deck: number }) => ({ tcg: "seat", seat: s, ...i });
const setSeatMarker = (s: Seat, i: { userId: string; name: string; hand: number; deck: number }) =>
    upsertText(ID.seat(s), sideX(s) + 20, 20, seatLabel(s, i.name, i.hand, i.deck), seatMeta(s, i), 22);
const setMatch = (n: number, req: Seat | null) =>
    upsertText(ID.match, W + 40, 20, `Match ${n}${req ? " (restart asked)" : ""}`, { tcg: "match", n, req }, 20);

async function readBoard() {
    users = (await cmd("command:collaboration:get-all-users-in-board")).users;
    const self = users.find((u) => u.isSelf);
    if (self) me = { id: self.id, name: self.name };
    const ids = [ID.match, ID.seat(1), ID.seat(2), ID.log(1), ID.log(2)];
    const by = new Map((await getEls(ids, ["meta"])).map((e) => [e.id, e.meta ?? {}]));
    const m: any = by.get(ID.match);
    board = {
        n: m?.n ?? 1,
        req: m?.req ?? null,
        seats: {
            1: seatInfo(by.get(ID.seat(1))),
            2: seatInfo(by.get(ID.seat(2))),
        },
        logs: { 1: by.get(ID.log(1))?.entries ?? [], 2: by.get(ID.log(2))?.entries ?? [] },
    };
}
const seatInfo = (m: any) => (m?.userId ? { userId: m.userId, name: m.name ?? "Player", hand: m.hand ?? 0, deck: m.deck ?? 0 } : null);

async function logAct(text: string) {
    const s = mySeat();
    if (!s) return;
    const entries: LogEntry[] = [...board.logs[s], { t: Date.now(), text }].slice(-40);
    board.logs[s] = entries;
    const shown = entries.slice(-6).map((e) => e.text);
    await upsertText(ID.log(s), sideX(s) + 20, 56, shown.join("\n"), { tcg: "log", entries }, 14);
}

// ---------- Cards on the table ----------
function blobFor(c: LibCard | undefined): Blob {
    if (!c) return back.blob;
    let b = blobCache.get(c.id);
    if (!b) blobCache.set(c.id, (b = dataUrlToBlob(c.img)));
    return b;
}

function cardElement(eid: string, x: number, y: number, libId: string, faceDown: boolean, extra: Record<string, unknown>) {
    const c = libCard(libId);
    return {
        type: "image", drawdyElementId: eid, x, y, width: CARD_W, height: CARD_H,
        blob: faceDown ? back.blob : blobFor(c),
        meta: { tcg: "card", owner: local!.seat, faceDown, ...(faceDown ? {} : { name: c?.name ?? "?" }), ...extra },
    };
}

async function putCard(inst: Inst, kind: TableCard["kind"], pos: { x: number; y: number }, faceDown: boolean) {
    const eid = `tcg-c-${newId()}`;
    await add([cardElement(eid, pos.x, pos.y, inst.libId, faceDown, { kind, tapped: false })]);
    local!.table[eid] = { iid: inst.iid, libId: inst.libId, kind, faceDown, tapped: false };
    return eid;
}

const TAP = { time: { durationMs: 150, curve: "linear", repeat: "none" }, animation: { transform: { rotation: [0, Math.PI / 2] }, curve: "linear" } };
const setTap = (eid: string, on: boolean) =>
    upd([{ drawdyElementId: eid, properties: { meta: { tapped: on }, localAnimation: on ? TAP : null } }]);

async function ownEls(s: Seat): Promise<any[]> {
    return (await queryRect(sideRect(s), ["meta", "x", "y", "width", "height"])).filter((e) => e.meta?.owner === s);
}
const rectOf = (e: any): Rect => ({ x: e.x, y: e.y, width: e.width, height: e.height });

async function cleanSide(s: Seat) {
    await rm((await ownEls(s)).map((e) => e.id));
}

// ---------- committing local changes to the shared board ----------
async function commit() {
    const l = local;
    const s = mySeat();
    if (!l || !s) return;
    // Deck pile
    if (l.deck.length && !l.deckPile) {
        const p = zoneSlot(s, "deck");
        await add([{ type: "image", drawdyElementId: ID.pile(s), x: p.x, y: p.y, width: CARD_W, height: CARD_H, blob: back.blob, meta: { tcg: "pile", owner: s } }]);
        await lockIds([ID.pile(s)]);
        l.deckPile = true;
    } else if (!l.deck.length && l.deckPile) {
        await rm([ID.pile(s)]);
        l.deckPile = false;
    }
    // Hand shown to the opponent
    const sig = l.shown ? l.hand.map((c) => c.iid).join(",") : "";
    if (sig !== shownSig || (!l.shown && l.shownEids.length)) {
        await rm(l.shownEids);
        l.shownEids = [];
        if (l.shown && l.hand.length) {
            const els = l.hand.map((c, i) => {
                const p = shownPos(s, i);
                return cardElement(`tcg-h-${newId()}`, p.x, p.y, c.libId, false, { tcg: "shown" });
            });
            await add(els);
            await lockIds(els.map((e) => e.drawdyElementId));
            l.shownEids = els.map((e) => e.drawdyElementId);
        }
        shownSig = sig;
    }
    // Counts
    const discard = (await ownEls(s)).filter((e) => e.meta?.kind === "card" && centerIn(rectOf(e), zoneRect(s, "discard"))).length;
    const counts = { deck: l.deck.length, discard, hand: l.hand.length };
    if (!lastCounts || lastCounts.deck !== counts.deck) {
        const r = zoneRect(s, "deck");
        await upsertText(ID.count(s, "deck"), r.x, r.y + r.height + 6, `Deck ${counts.deck}`, { tcg: "count", owner: s });
    }
    if (!lastCounts || lastCounts.discard !== counts.discard) {
        const r = zoneRect(s, "discard");
        await upsertText(ID.count(s, "discard"), r.x, r.y + r.height + 6, `Discard ${counts.discard}`, { tcg: "count", owner: s });
    }
    if (!lastCounts || lastCounts.deck !== counts.deck || lastCounts.hand !== counts.hand) {
        const info = board.seats[s];
        if (info) await setSeatMarker(s, { ...info, hand: counts.hand, deck: counts.deck });
        if (info) board.seats[s] = { ...info, hand: counts.hand, deck: counts.deck };
    }
    lastCounts = counts;
    await kvSet("local", l);
    pushState();
}

// ---------- Deck, Hand and table actions ----------
const activeCards = () => resolveDeck(decks.find((d) => d.id === activeDeck), lib.deck).cards;
function loadDeckInternal() {
    const l = local!;
    l.deck = shuffle(buildDeck(activeCards(), () => `i${l.iidN++}`));
}
const names = (cards: Inst[]) => cards.map((c) => libCard(c.libId)?.name ?? "?").join(", ");

async function resetSide(n: number) {
    const s = mySeat();
    if (!s) return;
    await cleanSide(s);
    local = { matchNo: n, seat: s, iidN: 0, deck: [], hand: [], table: {}, held: null, shown: false, shownEids: [], deckPile: false, spawned: 0 };
    shownSig = "";
    lastCounts = null;
    pendingDrop = null;
    lookCard = null;
    if (activeCards().length) loadDeckInternal();
    await commit();
    await logAct(`started Match ${n} with a Deck of ${local.deck.length}`);
}

async function claim(seat: Seat) {
    if (mySeat()) return flash("You already hold a Side.");
    const mk = board.seats[seat];
    if (mk && mk.userId !== me.id && online(mk.userId)) return flash("That Side is taken.");
    if (mk) await rm([ID.seat(seat)]);
    try {
        await add([{ type: "text", drawdyElementId: ID.seat(seat), x: sideX(seat) + 20, y: 20, text: seatLabel(seat, me.name, 0, 0), fontSize: 22, color: GRAY, meta: seatMeta(seat, { userId: me.id, name: me.name, hand: 0, deck: 0 }) }]);
    } catch {
        return flash("Someone else took that Side first.");
    }
    board.seats[seat] = { userId: me.id, name: me.name, hand: 0, deck: 0 };
    adoptSaved();
    if (!local && !mk) await resetSide(board.n);
    else if (!local) flash("This device cannot resume that Match. Restart the Match to play here.");
    await logAct("sat down");
    await flyHome();
    await refresh();
}

/** Resume this device's own Match, if it is the same one the board is on. */
function adoptSaved() {
    const s = mySeat();
    if (!local && s && saved && saved.seat === s && saved.matchNo === board.n) {
        local = saved;
        lastCounts = null;
        shownSig = local.shown ? "?" : "";
    }
}

async function release() {
    const s = mySeat();
    if (!s) return;
    await logAct("left the table");
    await cleanSide(s);
    await rm([ID.seat(s), ID.count(s, "deck"), ID.count(s, "discard")]);
    board.seats[s] = null;
    local = null;
    saved = null;
    await cmd("command:kv-storage:delete", { key: "local" });
    await updateMirror();
    pushState();
}

async function draw(n: number) {
    const l = active()!;
    const [got, rest] = takeTop(l.deck, n);
    if (!got.length) return flash("Your Deck is empty.");
    l.deck = rest;
    l.hand.push(...got);
    await commit();
    await logAct(`drew ${got.length} card${got.length > 1 ? "s" : ""}`);
}

async function shuffleDeck() {
    const l = active()!;
    l.deck = shuffle(l.deck);
    await commit();
    await logAct("shuffled their Deck");
}

async function doMulligan(n: number | null) {
    const l = active()!;
    const count = n ?? l.hand.length;
    const r = mulligan(l.hand, l.deck, count);
    l.hand = r.hand;
    l.deck = r.deck;
    await commit();
    await logAct(`took a Mulligan and drew ${r.hand.length}`);
}

async function look(mode: "peek" | "reveal", n: number) {
    const l = active()!;
    if (l.held) return flash("Finish the current look first.");
    const [got, rest] = takeTop(l.deck, n);
    if (!got.length) return flash("Your Deck is empty.");
    l.deck = rest;
    l.held = { mode, cards: got, eids: {} };
    if (mode === "reveal") {
        const els = got.map((c, i) => {
            const p = revealPos(l.seat, i);
            const eid = `tcg-r-${newId()}`;
            l.held!.eids[c.iid] = eid;
            return cardElement(eid, p.x, p.y, c.libId, false, { tcg: "reveal" });
        });
        await add(els);
        await lockIds(els.map((e) => e.drawdyElementId));
    }
    await commit();
    await logAct(mode === "peek" ? `looked at the top ${got.length} of their Deck` : `revealed the top ${got.length}: ${names(got)}`);
}

async function closeHeld() {
    const l = active()!;
    if (!l.held) return;
    await rm(Object.values(l.held.eids));
    l.deck = [...l.held.cards, ...l.deck];
    l.held = null;
    await commit();
}

async function move(iid: string, from: string, to: string) {
    const l = active()!;
    let inst: Inst | undefined;
    if (from === "hand") [inst, l.hand] = removeById(l.hand, iid);
    else if (from === "deck") [inst, l.deck] = removeById(l.deck, iid);
    else if (from === "held" && l.held) {
        [inst, l.held.cards] = removeById(l.held.cards, iid);
        const eid = l.held.eids[iid];
        if (eid) await rm([eid]);
        delete l.held.eids[iid];
        if (!l.held.cards.length) l.held = null;
    }
    if (!inst) return;
    const s = l.seat;
    if (to === "hand") l.hand.push(inst);
    else if (to === "top") l.deck.unshift(inst);
    else if (to === "bottom") l.deck.push(inst);
    else if (to === "discard") await putCard(inst, "card", zoneSlot(s, "discard"), false);
    else await putCard(inst, "card", spawnPos(s, l.spawned++), to === "playdown");
    await commit();
}

async function toggleShown(on: boolean) {
    const l = active()!;
    l.shown = on;
    await commit();
    await logAct(on ? `showed their Hand: ${names(l.hand) || "empty"}` : "hid their Hand");
}

async function selectedOwn(): Promise<string[]> {
    const l = active();
    if (!l) return [];
    const r = await cmd("command:scene:get-current-selected-drawdy-elements");
    return (r.drawdyElementIds as string[]).filter((id) => l.table[id]);
}

async function cardAction(kind: string) {
    const l = active()!;
    const ids = await selectedOwn();
    if (!ids.length) return flash("Select one of your own cards on the table first.");
    for (const eid of ids) {
        const t = l.table[eid];
        if (!t) continue;
        const isCard = t.kind === "card";
        if (kind === "tap") {
            t.tapped = !t.tapped;
            await setTap(eid, t.tapped);
        } else if (kind === "flip") {
            const [el] = await getEls([eid], ["x", "y"]);
            if (!el) continue;
            const nid = `tcg-c-${newId()}`;
            t.faceDown = !t.faceDown;
            await rm([eid]);
            await add([cardElement(nid, el.x, el.y, t.libId, t.faceDown, { kind: t.kind, tapped: t.tapped })]);
            delete l.table[eid];
            l.table[nid] = t;
            if (t.tapped) await setTap(nid, true);
        } else if (kind === "peekcard") {
            lookCard = t.libId;
            await logAct("looked at a face-down card");
        } else if (kind === "remove" || (!isCard && ["discard", "tohand", "ptop", "pbottom"].includes(kind))) {
            await rm([eid]);
            delete l.table[eid];
        } else {
            const inst = { iid: t.iid, libId: t.libId };
            await rm([eid]);
            delete l.table[eid];
            if (kind === "discard") await putCard(inst, "card", zoneSlot(l.seat, "discard"), false);
            else if (kind === "tohand") l.hand.push(inst);
            else if (kind === "ptop") l.deck.unshift(inst);
            else if (kind === "pbottom") l.deck.push(inst);
        }
    }
    await commit();
}

async function addFromLib(kind: "tokens" | "customs", id: string) {
    const l = active();
    if (!l) return flash("Take a Side first.");
    if (!libCard(id)) return;
    const r = sideRect(l.seat);
    const inSide = lastPtr.x > r.x && lastPtr.x < r.x + r.width && lastPtr.y > r.y && lastPtr.y < r.y + r.height;
    const pos = inSide ? { x: lastPtr.x - CARD_W / 2, y: lastPtr.y - CARD_H / 2 } : spawnPos(l.seat, l.spawned++);
    await putCard({ iid: `t${l.iidN++}`, libId: id }, kind === "tokens" ? "token" : "custom", pos, false);
    await commit();
}

async function afterDrag(ids: string[]) {
    const l = active();
    if (!l) return;
    const own = ids.filter((id) => l.table[id]);
    if (!own.length) return;
    const { rects } = await cmd("command:scene:element-rects", { drawdyElementIds: own });
    for (const { drawdyElementId: eid, rect } of rects as { drawdyElementId: string; rect: Rect }[]) {
        const t = l.table[eid];
        if (t?.kind !== "card") continue;
        if (centerIn(rect, zoneRect(l.seat, "discard"))) {
            const p = zoneSlot(l.seat, "discard");
            await upd([{ drawdyElementId: eid, properties: { transform: { x: p.x, y: p.y } } }]);
        } else if (centerIn(rect, zoneRect(l.seat, "deck"))) {
            pendingDrop = eid;
        }
    }
    await commit();
}

async function dropDeck(to: string) {
    const l = active()!;
    const eid = pendingDrop;
    pendingDrop = null;
    const t = eid ? l.table[eid] : undefined;
    if (!eid || !t || to === "cancel") return pushState();
    await rm([eid]);
    delete l.table[eid];
    const inst = { iid: t.iid, libId: t.libId };
    if (to === "top") l.deck.unshift(inst);
    else l.deck.push(inst);
    await commit();
}

// ---------- Restart ----------
async function restartRequest() {
    if (!mySeat()) return;
    await setMatch(board.n, mySeat());
    await logAct("asked to Restart the Match");
}
async function restartAnswer(accept: boolean) {
    const s = mySeat();
    if (!s || !board.req || board.req === s) return;
    if (accept) await setMatch(board.n + 1, null);
    else {
        await setMatch(board.n, null);
        await logAct("declined the Restart");
    }
}

// ---------- camera ----------
async function flyHome() {
    const s = mySeat();
    await cmd("command:camera:fly-to-rect", { rect: s ? cameraRect(s) : bothSidesRect(), flyDurationMs: 500, zoom: 1 });
}

// ---------- Mirror and views of the opponent ----------
async function elementDataUrl(id: string): Promise<string> {
    let u = imgCache.get(id);
    if (!u) {
        const { blob } = await cmd("command:scene:get-image-source", { drawdyElementId: id });
        imgCache.set(id, (u = await blobToDataUrl(blob)));
    }
    return u;
}

async function updateMirror() {
    const s = mySeat();
    if (!s) {
        if (mirrorPreview) {
            await cmd("command:scene:delete-drawdy-preview-elements", { previewIds: [mirrorPreview] });
            mirrorPreview = null;
            mirrorLast = "";
        }
        return;
    }
    const opp = other(s);
    const els: any[] = await queryRect(sideRect(opp), ["type", "x", "y", "width", "height", "meta", "text", "points", "fillColor", "strokeColor", "textColor", "componentType"]);
    const imgs: Record<string, string> = {};
    for (const e of els) if (e.type === "image") imgs[e.id] = await elementDataUrl(e.id).catch(() => "");
    discardView.opp = els
        .filter((e) => e.meta?.kind === "card" && !e.meta?.faceDown && centerIn(rectOf(e), zoneRect(opp, "discard")))
        .map((e) => ({ name: e.meta?.name ?? "?", img: imgs[e.id] ?? "" }));
    const svg = mirrorSvg(els as MEl[], opp, imgs);
    if (svg === mirrorLast) return;
    mirrorLast = svg;
    const r = mirrorRect(s);
    const el = {
        type: "component", drawdyElementId: ID.mirror, x: r.x, y: r.y, width: W, height: H,
        schema: { type: "image", child: svgToDataUrl(svg), styles: { width: [W, "px"], height: [H, "px"] } },
    };
    if (mirrorPreview) await cmd("command:scene:update-drawdy-preview-elements", { elements: [el] });
    else mirrorPreview = (await cmd("command:scene:create-drawdy-preview-elements", { elements: [el] })).previewId;
}

// ---------- refresh: read the board, react, redraw ----------
async function refresh() {
    await ensureBoard();
    await readBoard();
    const s = mySeat();
    if (s && seenN > 0 && board.n > seenN) await resetSide(board.n);
    seenN = board.n;
    adoptSaved();
    const l = active();
    if (s && l) {
        const mine = await ownEls(s);
        discardView.mine = mine
            .filter((e) => e.meta?.kind === "card" && centerIn(rectOf(e), zoneRect(s, "discard")))
            .map((e) => ({ libId: l.table[e.id]?.libId ?? "" }))
            .filter((c) => c.libId);
    } else discardView.mine = [];
    await updateMirror().catch((e) => flash(String(e.message ?? e)));
    pushState();
}
function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void enqueue(refresh), 150);
}

// ---------- panel ----------
function stateMsg(): PanelState {
    const s = mySeat();
    const l = active();
    const seatView = (x: Seat) => {
        const i = board.seats[x];
        return i ? { name: i.name, online: online(i.userId), hand: i.hand, deck: i.deck } : null;
    };
    return {
        t: "state", msg: flashMsg, me, seat: s, status: !s ? "none" : l ? "ready" : "stale",
        seats: { 1: seatView(1), 2: seatView(2) }, matchNo: board.n, restart: board.req,
        deck: l?.deck ?? [], hand: l?.hand ?? [], held: l?.held ? { mode: l.held.mode, cards: l.held.cards } : null,
        look: lookCard, shown: !!l?.shown, drop: pendingDrop !== null, discard: discardView,
        log: SEATS.flatMap((x) => board.logs[x].map((e) => ({ ...e, seat: x }))).sort((a, b) => a.t - b.t),
        deckSize: activeCards().reduce((n, c) => n + c.count, 0),
    };
}
const post = (message: unknown) => cmd("command:webview:post-message", { webviewDomId: WEBVIEW, message }).catch(() => {});
const pushState = () => void post(stateMsg());
const pushLib = () => void post({ t: "lib", lib });
const pushDecks = () => void post({ t: "decks", list: decks, active: activeDeck });
const pushDraft = () => void post({ t: "draft", draft, name: draftName });
const saveDecks = () => kvSet("decks", { list: decks, active: activeDeck });
const cardCount = (l: Lib) => KINDS.reduce((n, k) => n + l[k].length, 0);

// The panel wears Drawdy's theme: the --dd-* tokens when the host sends them, else the older ModuleStyling fields mapped onto the same names.
// Baked into the HTML at creation, and posted again whenever the theme flips or a hidden panel is shown.
let styling: any = {};
function themeCss(): string {
    const s = styling;
    const t: Record<string, string> = s.tokens ?? {
        "--dd-surface-panel": s.surface, "--dd-surface-section": s.surface2,
        "--dd-text-primary": s.foreground, "--dd-text-secondary": s.mutedForeground, "--dd-text-tertiary": s.mutedForeground,
        "--dd-border-subtle": s.border, "--dd-border-medium": s.border,
        "--dd-accent": s.primary, "--dd-on-accent": s.primaryForeground, "--dd-accent-text": s.primary,
        "--dd-status-danger": s.destructive, "--dd-status-success": s.success, "--dd-status-warning": s.warning,
    };
    const vars = Object.entries(t).filter(([, v]) => typeof v === "string" && !/[;{}<]/.test(v)).map(([k, v]) => `${k}:${v};`).join("");
    return vars + (s.theme === "light" || s.theme === "dark" ? `color-scheme:${s.theme};` : "");
}
const postTheme = () => void post({ t: "theme", css: themeCss() });

// The action button only raises a click event; the driver opens the panel. Creating a kept-alive webview that already
// exists shows it again (created: false), which is how a closed panel comes back. keepStateWhenClosed keeps the panel (and the Creator draft in it) alive while hidden.
const createPanel = () =>
    cmd("command:webview:create", { webviewDomId: WEBVIEW, htmlContent: PANEL_HTML.replace("/*__THEME__*/", () => themeCss()), keepStateWhenClosed: true });

async function onPanel(m: any) {
    if (m.t === "ready") {
        pushLib();
        pushDecks();
        pushDraft();
        return pushState();
    }
    if ((m.t === "lib" || m.t === "draft") && (!KINDS.includes(m.kind) || !Array.isArray(m.list))) return;
    // The panel only removes cards from the Library; cards come in through .ddc files.
    if (m.t === "lib") {
        const kind = m.kind as LibKind;
        lib[kind] = m.list;
        blobCache.clear();
        await kvSet(`lib-${kind}`, { list: lib[kind] });
        if (kind !== "deck") await buildMenu();
        return pushState();
    }
    if (m.t === "decks") {
        decks = cleanDecks(m.list, newId);
        activeDeck = decks.some((d) => d.id === m.active) ? m.active : (decks[0]?.id ?? "");
        await saveDecks();
        // The panel already shows what it sent; answer only when cleaning changed something.
        if (activeDeck !== m.active || JSON.stringify(decks) !== JSON.stringify(m.list)) pushDecks();
        return pushState();
    }
    if (m.t === "deckText") {
        const d = decks.find((x) => x.id === m.id);
        if (!d || typeof m.text !== "string") return;
        d.cards = parseDeckText(m.text.slice(0, 100_000));
        await saveDecks();
        pushDecks();
        pushState();
        const { missing } = resolveDeck(d, lib.deck);
        const lack = missing.length ? `. Not in your Library yet: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` and ${missing.length - 5} more` : ""}` : "";
        return post({ t: "note", text: `Updated "${d.name}": ${d.cards.reduce((n, c) => n + c.count, 0)} cards${lack}.` });
    }
    if (m.t === "draft") {
        draft[m.kind as LibKind] = m.list;
        return kvSet(`draft-${m.kind}`, { list: m.list });
    }
    if (m.t === "draftName") {
        draftName = String(m.name ?? "").slice(0, 80);
        return kvSet("draft-name", { name: draftName });
    }
    // The Creator's cards go through the same path as a file, so they get the same checks and the same Deck.
    if (m.t === "draftUse") {
        if (!cardCount(draft)) return post({ t: "note", text: "Add some cards first." });
        return onPanel({ t: "ddcImport", file: "Creator", text: encodeDdc(String(m.name ?? ""), draft) });
    }
    if (m.t === "ddcImport") {
        // The panel shows "Importing..." until a note arrives, so every exit must post one.
        try {
            const r = decodeDdc(m.text);
            if (!r.ok) return post({ t: "note", text: `${m.file}: ${r.error}` });
            let skipped = r.skipped;
            const fitted: Ddc = { name: r.ddc.name, deck: [], tokens: [], customs: [] };
            // ponytail: one bitmap at a time keeps memory flat, but a 2000 Card file holds the panel queue until it is done; use a small pool if that hurts.
            for (const k of KINDS) {
                for (const c of r.ddc[k]) {
                    const img = await fitCard(c.img);
                    if (img) fitted[k].push({ ...c, img });
                    else skipped++;
                }
            }
            const merged = mergeDdc(lib, fitted, newId);
            lib = merged.lib;
            // A file that lists copies brings a Deck named after it. An existing Deck of that name is never overwritten.
            const made = addDeck(decks, fitted.name, merged.deck, newId);
            if (made) {
                decks = made;
                if (!decks.some((d) => d.id === activeDeck)) activeDeck = decks[decks.length - 1].id;
            }
            blobCache.clear();
            for (const k of KINDS) await kvSet(`lib-${k}`, { list: lib[k] });
            if (made) await saveDecks();
            await buildMenu();
            pushLib();
            pushDecks();
            pushState();
            const deck = made ? ` Deck "${fitted.name}" created.` : merged.deck.length ? ` A Deck named "${fitted.name}" already exists, so it was left alone.` : "";
            return post({ t: "note", text: `Imported "${fitted.name}": ${merged.added} added, ${merged.updated} updated${skipped ? `, ${skipped} skipped` : ""}.${deck}` });
        } catch (e) {
            return post({ t: "note", text: `${m.file}: import failed (${e instanceof Error ? e.message : e})` });
        }
    }
    if (m.t === "ddcExport") {
        const from = m.from === "draft" ? "draft" : "lib";
        const src = from === "draft" ? draft : lib;
        const cards = cardCount(src);
        if (!cards) return post({ t: "note", text: from === "draft" ? "Add some cards first." : "Nothing to export yet." });
        return post({ t: "ddcFile", from, file: ddcFileName(m.name), text: encodeDdc(m.name, src), cards });
    }
    if (m.t !== "act") return;
    const typed = Math.max(0, Math.floor(Number(m.n) || 0)); // 0 = the Player left N empty
    lastN = typed || 1;
    const a = m.a as string;
    if (a === "claim") return claim(Number(m.seat) as Seat);
    if (a === "release") return release();
    if (a === "flyHome") return flyHome();
    if (a === "restartRequest") return restartRequest();
    if (a === "restartAccept") return restartAnswer(true);
    if (a === "restartDecline") return board.req === mySeat() ? setMatch(board.n, null) : restartAnswer(false);
    if (!active()) return flash("Take a Side and be in the current Match first.");
    switch (a) {
        case "loadDeck": {
            const l = active()!;
            if (l.deck.length || l.hand.length || Object.keys(l.table).length) return flash("Restart the Match to rebuild the Deck.");
            loadDeckInternal();
            await commit();
            return logAct(`loaded a Deck of ${l.deck.length}`);
        }
        case "draw": return draw(lastN);
        case "shuffle": return shuffleDeck();
        case "mulligan": return doMulligan(typed || null);
        case "peek": return look("peek", lastN);
        case "reveal": return look("reveal", lastN);
        case "searchOpen": return logAct("is searching their Deck");
        case "move": return move(m.iid, m.from, m.to);
        case "closeHeld": return closeHeld();
        case "toggleShown": return toggleShown(!!m.on);
        case "dropDeck": return dropDeck(m.to);
        case "closeLook":
            lookCard = null;
            return pushState();
    }
}

// ---------- context menu ----------
async function buildMenu() {
    const leaf = (id: string, title: string) => ({ menuId: id, menuTitle: title });
    const dyn = (kind: "tokens" | "customs", prefix: string) =>
        lib[kind].length ? lib[kind].map((c) => leaf(`${prefix}${c.id}`, c.name)) : [leaf("tcg:noop", "(import a .ddc file in the Library)")];
    const tree = {
        menuId: "tcg:root", menuTitle: "TCG Tabletop",
        children: [
            { menuId: "tcg:card", menuTitle: "Selected card", children: [
                leaf("tcg:flip", "Flip face-up / face-down"), leaf("tcg:tap", "Tap / untap"), leaf("tcg:peekcard", "Peek (face-down)"),
                leaf("tcg:discard", "Discard"), leaf("tcg:tohand", "Return to Hand"), leaf("tcg:ptop", "Push to top of Deck"),
                leaf("tcg:pbottom", "Push to bottom of Deck"), leaf("tcg:remove", "Remove from table"),
            ] },
            { menuId: "tcg:deck", menuTitle: "Deck", children: [
                leaf("tcg:draw", "Draw"), leaf("tcg:shuffle", "Shuffle"), leaf("tcg:mulligan", "Mulligan"),
                leaf("tcg:search", "Search"), leaf("tcg:peek", "Peek top N"), leaf("tcg:reveal", "Reveal top N"),
            ] },
            leaf("tcg:hand", "Show / hide my Hand"),
            { menuId: "tcg:token", menuTitle: "Add Token", children: dyn("tokens", "tcg:token:") },
            { menuId: "tcg:custom", menuTitle: "Add Custom Card", children: dyn("customs", "tcg:custom:") },
        ],
    };
    await cmd("command:context-menu:remove", { menuId: "tcg:root" }).catch(() => {});
    await cmd("command:context-menu:add", tree);
    const leaves = [...MENU_LEAVES, ...lib.tokens.map((c) => `tcg:token:${c.id}`), ...lib.customs.map((c) => `tcg:custom:${c.id}`)];
    for (const menuId of leaves) {
        if (subscribedMenus.has(menuId)) continue;
        subscribedMenus.add(menuId);
        await cmd("subscription:context-menu:clicked", { menuId });
    }
}

async function onMenu(id: string) {
    if (id.startsWith("tcg:token:")) return addFromLib("tokens", id.slice(10));
    if (id.startsWith("tcg:custom:")) return addFromLib("customs", id.slice(11));
    const l = active();
    if (!l) return flash("Take a Side and be in the current Match first.");
    const cardKinds: Record<string, string> = {
        "tcg:flip": "flip", "tcg:tap": "tap", "tcg:peekcard": "peekcard", "tcg:discard": "discard", "tcg:tohand": "tohand",
        "tcg:ptop": "ptop", "tcg:pbottom": "pbottom", "tcg:remove": "remove",
    };
    if (cardKinds[id]) return cardAction(cardKinds[id]);
    if (id === "tcg:draw") return draw(1);
    if (id === "tcg:shuffle") return shuffleDeck();
    if (id === "tcg:mulligan") return doMulligan(null);
    if (id === "tcg:search") {
        await logAct("is searching their Deck");
        return flash("Open the TCG panel (right edge button) to search your Deck.");
    }
    if (id === "tcg:peek") return look("peek", lastN);
    if (id === "tcg:reveal") return look("reveal", lastN);
    if (id === "tcg:hand") return toggleShown(!l.shown);
}

// ---------- driver entry ----------
export const activate: DriverModule["activate"] = async (ctx) => {
    issue = ctx.issueCommand;
    driverId = ctx.manifest.driverId;
    newId = ctx.generateId;
    styling = ctx.styling ?? {};

    for (const kind of KINDS) lib[kind] = (await kvGet(`lib-${kind}`))?.list ?? [];
    const sd = await kvGet("decks");
    if (sd) {
        decks = cleanDecks(sd.list, newId);
        activeDeck = decks.some((d) => d.id === sd.active) ? sd.active : (decks[0]?.id ?? "");
    } else {
        // First run since the Library moved to .ddc files: the old Deck List (copies set on each card) becomes the Deck "My Deck".
        decks = cleanDecks([{ name: "My Deck", cards: lib.deck }], newId).filter((d) => d.cards.length);
        activeDeck = decks[0]?.id ?? "";
        if (decks.length) await saveDecks();
    }
    for (const kind of KINDS) draft[kind] = (await kvGet(`draft-${kind}`))?.list ?? [];
    draftName = (await kvGet("draft-name"))?.name ?? "";
    saved = (await kvGet("local")) ?? null;
    back = await makeCardBack();

    for (const type of ["added", "updated", "removed", "replaced"]) {
        await cmd(`subscription:scene:elements-${type}`, { properties: ["meta"] });
    }
    await cmd("subscription:scene:pointer-position");
    await cmd("subscription:scene:drawdy-elements-dragged");
    await cmd("subscription:collaboration:presence-changed");
    await cmd("subscription:webview:message", { webviewDomId: WEBVIEW });
    await cmd("subscription:dom:element-clicked", { domElementId: BUTTON });
    await cmd("subscription:dom:theme-changed");
    await cmd("command:dom:create-action-button", {
        domElementId: BUTTON,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="11" height="16" rx="2"/><rect x="9" y="6" width="11" height="16" rx="2" fill="currentColor" fill-opacity=".25"/></svg>',
    });
    await buildMenu();
    await createPanel();
    await enqueue(refresh);
};

export const onEvent: DriverModule["onEvent"] = async (event) => {
    const e = event as any;
    switch (e.type) {
        case "subscription:scene:pointer-position":
            lastPtr = e.body.position.canvasSpace;
            return;
        case "subscription:scene:drawdy-elements-dragged":
            if (e.body.type === "dragEnd") {
                const ids = [...dragIds];
                dragIds.clear();
                void enqueue(() => afterDrag(ids));
            } else for (const id of e.body.drawdyElementIds) dragIds.add(id);
            return;
        case "subscription:context-menu:clicked":
            return void enqueue(() => onMenu(e.body.menuId));
        case "subscription:webview:message":
            return void enqueue(() => onPanel(e.body.message));
        case "subscription:dom:element-clicked":
            if (e.body.domElementId !== BUTTON) return;
            // A panel that was already alive may carry a theme from before a flip.
            return void createPanel().then((r) => r.created === false && postTheme()).catch(() => {});
        case "subscription:dom:theme-changed":
            styling = e.body.styling;
            return postTheme();
        case "subscription:collaboration:presence-changed":
            users = e.body.users;
            return scheduleRefresh();
        default:
            if (String(e.type).startsWith("subscription:scene:elements-")) scheduleRefresh();
    }
};
