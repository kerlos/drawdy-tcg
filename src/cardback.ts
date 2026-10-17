import { blobToDataUrl } from "./util";

/** The Card Back: a dark card with the Drawdy wordmark and its green loops. Drawn once in the worker. */
export async function makeCardBack(): Promise<{ blob: Blob; url: string }> {
    // Drawn in 252x352 units, scaled up to the 388x528 every other Card uses.
    const w = 252;
    const h = 352;
    const c = new OffscreenCanvas(388, 528);
    const g = c.getContext("2d")!;
    g.scale(388 / w, 528 / h);
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#1c1c24");
    bg.addColorStop(1, "#0d0d12");
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(0, 0, w, h, 18);
    g.fill();
    g.strokeStyle = "#9bd400";
    g.lineWidth = 6;
    g.beginPath();
    g.roundRect(10, 10, w - 20, h - 20, 12);
    g.stroke();
    g.lineWidth = 9;
    g.lineCap = "round";
    for (let i = 0; i < 3; i++) {
        const x = 62 + i * 64;
        g.beginPath();
        g.moveTo(x - 24, h / 2 + 20);
        g.bezierCurveTo(x - 24, h / 2 - 70, x + 24, h / 2 - 70, x + 4, h / 2 + 20);
        g.bezierCurveTo(x - 6, h / 2 + 60, x + 30, h / 2 + 60, x + 30, h / 2 + 20);
        g.stroke();
    }
    g.fillStyle = "#e8e8ee";
    g.font = "bold 34px sans-serif";
    g.textAlign = "center";
    g.fillText("drawdy", w / 2, h / 2 + 120);
    const blob = await c.convertToBlob({ type: "image/png" });
    return { blob, url: await blobToDataUrl(blob) };
}
