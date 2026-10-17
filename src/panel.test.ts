// Runs the gzip helpers that live inside the panel's script, against Node's Blob/File/CompressionStream.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodeDdc } from "./ddc.ts";

const src = readFileSync(new URL("./panel.ts", import.meta.url), "utf8");
const block = src.split("// gz:begin")[1]?.split("// gz:end")[0];
assert.ok(block, "gz block markers missing from panel.ts");
const load = (max: number) =>
    new Function(block.replace("var MAXTXT=80000000;", `var MAXTXT=${max};`) + ";return {gz,readDdc}")() as {
        gz: (t: string) => Promise<Blob>;
        readDdc: (f: Blob) => Promise<string>;
    };

const img = "data:image/jpeg;base64," + Buffer.from(crypto.getRandomValues(new Uint8Array(30000))).toString("base64");
const text = encodeDdc("T", { deck: [{ id: "a", name: "A", count: 1, img }], tokens: [], customs: [] });
const { gz, readDdc } = load(80_000_000);

const packed = await gz(text);
const head = new Uint8Array(await packed.slice(0, 2).arrayBuffer());
assert.deepEqual([...head], [0x1f, 0x8b], "export is gzip");
assert.ok(packed.size < text.length * 0.8, "gzip drops the base64 overhead");
assert.equal(await readDdc(packed), text, "gzip round trip");
assert.equal(await readDdc(new Blob([text])), text, "plain JSON still reads");

await assert.rejects(readDdc(new Blob([new Uint8Array([0x1f, 0x8b, 1, 2, 3])])), "corrupt gzip rejects");
await assert.rejects(load(1000).readDdc(await load(1000).gz("x".repeat(1_000_000))), /too large/, "gzip bomb is capped");

console.log("panel gzip checks passed");
