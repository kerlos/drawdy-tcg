export type Seat = 1 | 2;
export type Rect = { x: number; y: number; width: number; height: number };

export const CARD_W = 105;
export const CARD_H = 147;
export const W = 1800; // a Side is W x H canvas units
export const H = 900;
const GAP_X = 500; // between the two Sides
const GAP_Y = 60; // between a Side and the Mirror above it
const PAD = 15;
const ZW = CARD_W + PAD * 2;
const ZH = CARD_H + PAD * 2;

export const sideX = (s: Seat) => (s === 1 ? 0 : W + GAP_X);
export const other = (s: Seat): Seat => (s === 1 ? 2 : 1);
export const sideRect = (s: Seat): Rect => ({ x: sideX(s), y: 0, width: W, height: H });

export type ZoneName = "deck" | "discard";
export const zoneRect = (s: Seat, z: ZoneName): Rect => ({
    x: sideX(s) + (z === "deck" ? 1500 : 1650),
    y: 690,
    width: ZW,
    height: ZH,
});
/** Top-left of a card lying in a zone. */
export const zoneSlot = (s: Seat, z: ZoneName) => {
    const r = zoneRect(s, z);
    return { x: r.x + PAD, y: r.y + PAD };
};

const row = (s: Seat, i: number, baseY: number) => ({
    x: sideX(s) + 60 + (i % 12) * (CARD_W + 10),
    y: baseY - Math.floor(i / 12) * (CARD_H + 10),
});
export const revealPos = (s: Seat, i: number) => row(s, i, 440);
export const shownPos = (s: Seat, i: number) => row(s, i, 700);
export const spawnPos = (s: Seat, n: number) => ({
    x: sideX(s) + W / 2 - CARD_W / 2 + (n % 8) * 30,
    y: H / 2 - CARD_H / 2 + (n % 8) * 20,
});

/** What a Player's camera frames: their own Side plus the Mirror above it. */
export const cameraRect = (s: Seat): Rect => ({
    x: sideX(s) - 40,
    y: -(H + GAP_Y) - 40,
    width: W + 80,
    height: 2 * H + GAP_Y + 80,
});
/** Where the Mirror of the opponent is drawn: directly above own Side. */
export const mirrorRect = (s: Seat): Rect => ({ x: sideX(s), y: -(H + GAP_Y), width: W, height: H });
export const bothSidesRect = (): Rect => ({ x: -40, y: -40, width: sideX(2) + W + 80, height: H + 80 });

export const centerIn = (r: Rect, z: Rect) => {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;
};
