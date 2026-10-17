# A Library is shared as one gzipped .ddc JSON file

A `.ddc` Card File holds a whole Library (its cards, tokens and custom cards), with every image embedded as a base64 data URL. A Player imports it in one step and can export their own Library to share. The format is in `docs/ddc-format.md`.

## Why

Cards entered the Library one image at a time, so sharing a Deck meant sharing a folder of images and adding each by hand. One file removes that.

JSON with embedded images beats a zip container. The webview may load no libraries, so a zip would need a hand-written reader and writer in the panel script. JSON needs none, and a Player can open the file in a text editor to see what it holds.

Images are re-fitted to 388x528 WebP (quality 0.85) on import, and the panel stores new Cards the same way. A 252x352 JPEG from an older Library is kept as is, since upscaling adds no detail and would make a Library re-import its own export as duplicates. WebP is smaller than JPEG at comparable quality, which offsets part of the cost of 2.4 times the pixels, so a Card still takes more space than the old 252x352 JPEG. A shared file cannot bloat the Library, and a file from another tool ends up in the same shape as every other Card.

The JSON is gzip-compressed with the platform's `CompressionStream`, in the panel, which already holds the file and the Blob. Readers detect gzip by its magic bytes and still accept plain JSON, so no version bump was needed. The driver never sees compressed bytes, so its message protocol stays text.

The panel cannot rely on a download for export. The webview iframe is sandboxed with `allow-scripts` only, so a browser may block the save. The panel offers a download link and a Copy button that puts the file text on the clipboard to paste into a text file. That copy is plain JSON, because text cannot carry gzip without base64 again, which would undo the saving.

## Consequences

- Files are about a quarter smaller than the JSON text, as gzip removes the base64 overhead. The images are compressed already, so the size is set by the images: fewer or smaller Cards is the only way down from there.
- A reader stops decompressing at the size limit, so a gzip bomb cannot exhaust memory. Limits on file size and Card count keep import bounded.
- Import merges and never replaces, so a Player cannot lose a Library by importing a file. Importing the same file twice changes nothing. (Cards matched on name and image when this was written. ADR 0004 matches on name alone, because Decks refer to cards by name.)
- Image decoding runs in the driver worker, one image at a time, so a large file holds the panel queue until it finishes.
- Ids stay device-local. A file carries none, and import generates them.

## Rejected

- A zip container with image files. Smaller, but it needs a zip reader and writer in the panel, and the file is not inspectable.
- SVG images. They can carry scripts, so the reader rejects them.
- One file per Card. It repeats the problem this solves.
