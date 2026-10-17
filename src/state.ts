export type Inst = { iid: string; libId: string };

export function shuffle<T>(a: readonly T[], rnd: () => number = Math.random): T[] {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}

export function buildDeck(list: { id: string; count: number }[], newIid: () => string): Inst[] {
    return list.flatMap((c) =>
        Array.from({ length: Math.max(0, Math.floor(c.count)) }, () => ({ iid: newIid(), libId: c.id }))
    );
}

/** [top n cards, the rest]. n is clamped to the deck size. */
export function takeTop<T>(deck: readonly T[], n: number): [T[], T[]] {
    const k = Math.max(0, Math.min(Math.floor(n), deck.length));
    return [deck.slice(0, k), deck.slice(k)];
}

/** Return the hand to the deck, shuffle, draw n. */
export function mulligan(hand: readonly Inst[], deck: readonly Inst[], n: number, rnd?: () => number) {
    const [h, d] = takeTop(shuffle([...hand, ...deck], rnd), n);
    return { hand: h, deck: d };
}

export function removeById<T extends { iid: string }>(list: readonly T[], iid: string): [T | undefined, T[]] {
    const i = list.findIndex((c) => c.iid === iid);
    return i < 0 ? [undefined, [...list]] : [list[i], [...list.slice(0, i), ...list.slice(i + 1)]];
}
