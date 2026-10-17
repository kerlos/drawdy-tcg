export function bytesToB64(a: Uint8Array): string {
    let s = "";
    for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
    return btoa(s);
}

export function dataUrlToBlob(u: string): Blob {
    const [head, body] = u.split(",");
    const mime = /data:([^;,]+)/.exec(head)?.[1] ?? "image/png";
    const bin = atob(body);
    const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: mime });
}

export async function blobToDataUrl(b: Blob): Promise<string> {
    return `data:${b.type || "image/png"};base64,${bytesToB64(new Uint8Array(await b.arrayBuffer()))}`;
}

const CARD_PX_W = 388;
const CARD_PX_H = 528;

/**
 * A data URL as a 388x528 WebP Card image (JPEG where the browser cannot encode WebP), or null when it cannot be decoded.
 * Cover-fit like toCard in panel.ts.
 */
export async function fitCard(dataUrl: string): Promise<string | null> {
    try {
        const bmp = await createImageBitmap(dataUrlToBlob(dataUrl));
        try {
            // Untouched keeps a re-import identical to the Library copy, so merging stays idempotent.
            // JPEG counts too: it is what a browser without a WebP encoder wrote. So does the 252x352 JPEG of
            // Libraries made before 388x528: upscaling it would only add bytes, and re-importing a Library's own
            // export would add every old Card a second time.
            const sized = (w: number, h: number) => bmp.width === w && bmp.height === h;
            if (/^data:image\/(webp|jpeg)/.test(dataUrl) && sized(CARD_PX_W, CARD_PX_H)) return dataUrl;
            if (dataUrl.startsWith("data:image/jpeg") && sized(252, 352)) return dataUrl;
            const c = new OffscreenCanvas(CARD_PX_W, CARD_PX_H);
            const r = Math.max(CARD_PX_W / bmp.width, CARD_PX_H / bmp.height);
            const w = bmp.width * r;
            const h = bmp.height * r;
            c.getContext("2d")!.drawImage(bmp, (CARD_PX_W - w) / 2, (CARD_PX_H - h) / 2, w, h);
            let b = await c.convertToBlob({ type: "image/webp", quality: 0.85 });
            if (b.type !== "image/webp") b = await c.convertToBlob({ type: "image/jpeg", quality: 0.85 });
            return await blobToDataUrl(b);
        } finally {
            bmp.close();
        }
    } catch {
        return null;
    }
}

export const svgToDataUrl = (svg: string) =>
    "data:image/svg+xml;base64," + bytesToB64(new TextEncoder().encode(svg));
