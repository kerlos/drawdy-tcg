import type { Seat } from "./geometry";
import type { Inst } from "./state";

/** A Card in the Library: name, starter copies as the .ddc file listed them (Decks hold the real amounts), and a 388x528 WebP data URL (JPEG where WebP cannot be encoded). */
export type LibCard = { id: string; name: string; count: number; img: string };
export type LibKind = "deck" | "tokens" | "customs";
export type Lib = Record<LibKind, LibCard[]>;

/** A Deck holds Library card names, not ids, so a list can be shared as text and survives re-importing a card. */
export type DeckEntry = { name: string; count: number };
export type Deck = { id: string; name: string; cards: DeckEntry[] };

export type TableCard = {
    iid: string;
    libId: string;
    kind: "card" | "token" | "custom";
    faceDown: boolean;
    tapped: boolean;
};

/** Everything private to one Player's device. Never written to the scene. */
export type Local = {
    matchNo: number;
    seat: Seat;
    iidN: number;
    deck: Inst[];
    hand: Inst[];
    table: Record<string, TableCard>; // scene element id -> identity of my Cards on the table
    held: { mode: "peek" | "reveal"; cards: Inst[]; eids: Record<string, string> } | null;
    shown: boolean;
    shownEids: string[];
    deckPile: boolean;
    spawned: number;
};

export type LogEntry = { t: number; text: string };

export type SeatInfo = { userId: string; name: string; hand: number; deck: number };

/** What the driver reads back from the shared board. */
export type Board = {
    n: number;
    req: Seat | null; // Player who asked for a Restart
    seats: Record<Seat, SeatInfo | null>;
    logs: Record<Seat, LogEntry[]>;
};

export type PanelState = {
    t: "state";
    msg: string;
    me: { id: string; name: string };
    seat: Seat | null;
    status: "none" | "stale" | "ready";
    seats: Record<Seat, { name: string; online: boolean; hand: number; deck: number } | null>;
    matchNo: number;
    restart: Seat | null;
    deck: Inst[];
    hand: Inst[];
    held: { mode: "peek" | "reveal"; cards: Inst[] } | null;
    look: string | null; // libId of a face-down Card being peeked at
    shown: boolean;
    drop: boolean;
    discard: { mine: { libId: string }[]; opp: { name: string; img: string }[] };
    log: { t: number; seat: Seat; text: string }[];
    deckSize: number; // cards of the active Deck that are in the Library
};
