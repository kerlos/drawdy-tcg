# The .ddc Card File

A `.ddc` file (Drawdy Cards) carries cards with their images, so Players can share them as one file. It is how the Library is filled: the panel imports `.ddc` files and the Creator tab writes them. It is UTF-8 JSON, written with `JSON.stringify(obj, null, 1)`, then gzip-compressed.

## Container

- Writers gzip the JSON. This removes the base64 overhead of the images, so the file is about a quarter smaller than the JSON text. The images are compressed already, so gzip gains nothing more.
- Readers tell the two forms apart by the gzip magic bytes `1f 8b` at the start. Without them the file is read as plain JSON, so hand-written files and text pasted from the panel's Copy button still import.
- The limits below apply to the decompressed text. A reader stops decompressing once it passes the limit, so a small file cannot expand without bound.
- A writer that has no gzip may write plain JSON. The file is still valid.

## Shape

| Field | Type | Rule |
| --- | --- | --- |
| `format` | string | Must be `"ddc"`. |
| `version` | integer | `1`. |
| `name` | string | Name of the file, and of the Deck that importing it makes. Trimmed, at most 80 characters, defaults to `"Cards"`. |
| `deck` | array of Card | The Cards for Decks. Optional, defaults to `[]`. |
| `tokens` | array of Card | The Tokens. Optional, defaults to `[]`. |
| `customs` | array of Card | The Custom Cards. Optional, defaults to `[]`. |

Each Card has these fields.

| Field | Type | Rule |
| --- | --- | --- |
| `name` | string | Required. Trimmed, non-empty, at most 80 characters. |
| `count` | number | Starter copies, the amount in the Deck that importing the file makes (`deck` section only; tokens and custom cards ignore it). Rounded down and clamped to 0..99. Defaults to `1` when absent or not a finite number. `0` means the Card is in the file but not in the starter Deck. |
| `img` | string | Required. A base64 data URL, see below. |

A Card never carries an `id`. Ids are device-local and are generated again on import. A Card is identified by its `name` within its section, because Decks refer to Cards by name.

## Limits

- The JSON text is at most 80,000,000 characters.
- The three sections hold at most 2000 Cards in total.
- A section that is present but not an array makes the file invalid.

## Images

`img` must match `^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$`. SVG is rejected because it can carry scripts. Writers should store 388x528 WebP at quality 0.85. A browser that cannot encode WebP writes JPEG at the same size and quality instead. On import every image is re-fitted to 388x528 WebP (cover fit, JPEG where WebP cannot be encoded). A 388x528 WebP or JPEG is kept as is, and so is the 252x352 JPEG that Libraries made before 388x528 hold. Anything else is re-fitted. Keeping the old size matters twice: upscaling adds bytes but no detail, and a Library must re-import its own export unchanged.

A Card that breaks a rule above, or whose image cannot be decoded, is skipped and counted. The rest of the file still imports.

## Versioning

- Readers reject a `version` higher than the one they know. The error says the file was made by a newer TCG Tabletop.
- Readers ignore fields they do not know.
- A reader rejects a `version` that is not an integer or is below 1.

## Import

Importing merges the file into the Library. It never removes a Card or replaces the Library.

- Cards match on `name`, ignoring case, within the same section. So a Card is one name, however many images it has been given.
- A match takes the file's `img` and `count`, and keeps its own id and spelling of the name, so Decks and the board menu still find it. It counts as updated only if the image or the count changed.
- A Card with no match is appended with a new id.
- Cards in one file with the same name are one Card: the first image wins and `count` is the sum, capped at 99.
- If the `deck` section has Cards with `count` of 1 or more, a Deck named after the file is created from them (name and amount, see `docs/decks.md`) and chosen if the Player has no chosen Deck. A Deck with that name (ignoring case) is never overwritten, so a Deck the Player edited is safe. Tokens and Custom Cards are never part of a Deck.
- Importing the same file twice leaves the Library and the Decks unchanged the second time.

## Example

```json
{
 "format": "ddc",
 "version": 1,
 "name": "Starter Deck",
 "deck": [
  {
   "name": "Alpha",
   "count": 3,
   "img": "data:image/webp;base64,UklGRg"
  }
 ],
 "tokens": [],
 "customs": []
}
```
