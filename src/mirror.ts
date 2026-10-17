import { H, W, sideX, type Seat } from "./geometry";

/** The scene properties the Mirror reads from the opponent's Side. */
export type MEl = {
    id: string;
    type?: string;
    componentType?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    meta?: { tapped?: boolean } & Record<string, unknown>;
    text?: string;
    points?: [number, number][];
    fillColor?: string;
    strokeColor?: string;
    textColor?: string;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const num = (n: number | undefined, d = 0) => (Number.isFinite(n) ? (n as number) : d);

function text(t: string, x: number, y: number, h: number, fill = "#cfcfd6", anchor = "start") {
    const lines = t.split("\n");
    const fs = Math.max(10, Math.min(28, (h / lines.length) * 0.78));
    const tspans = lines
        .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : fs * 1.25}">${esc(l)}</tspan>`)
        .join("");
    return `<text x="${x}" y="${y + fs}" font-size="${fs}" font-family="sans-serif" text-anchor="${anchor}" fill="${esc(fill)}">${tspans}</text>`;
}

function one(e: MEl, sx: number, imgs: Record<string, string>): string {
    const x = num(e.x) - sx;
    const y = num(e.y);
    const w = num(e.width, 100);
    const h = num(e.height, 100);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const tapped = e.meta?.tapped ? ` transform="rotate(90 ${cx} ${cy})"` : "";
    switch (e.type) {
        case "image": {
            const href = imgs[e.id];
            return href
                ? `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}"${tapped}/>`
                : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#444"${tapped}/>`;
        }
        case "text":
            return text(e.text ?? "", x, y, h, e.textColor);
        case "freedraw": {
            const pts = (e.points ?? []).map(([px, py]) => `${px - sx},${py}`).join(" ");
            return pts ? `<polyline points="${pts}" fill="none" stroke="${esc(e.strokeColor ?? "#cfcfd6")}" stroke-width="3" stroke-linecap="round"/>` : "";
        }
        case "path": {
            const fill = esc(e.fillColor ?? "none");
            const stroke = esc(e.strokeColor ?? "#888");
            const body =
                e.componentType === "circle"
                    ? `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
                    : e.componentType === "diamond"
                      ? `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
                      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
            return body + (e.text ? text(e.text, cx, cy - 10, 20, e.textColor, "middle") : "");
        }
        default:
            return "";
    }
}

/** The opponent's Side as an SVG, turned 180 degrees like a card table seen from across. */
export function mirrorSvg(els: MEl[], opp: Seat, imgs: Record<string, string>): string {
    const body = els.map((e) => one(e, sideX(opp), imgs)).join("");
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
        `<rect width="${W}" height="${H}" rx="24" fill="#808080" fill-opacity="0.05" stroke="#888" stroke-width="3" stroke-dasharray="14 10"/>` +
        `<g transform="rotate(180 ${W / 2} ${H / 2})">${body}</g></svg>`
    );
}
