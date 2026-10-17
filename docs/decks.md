# Decks

A Deck is a named list of Library cards and how many of each. The Decks tab creates, edits and deletes them. The Table tab picks the one to play. It loads when a Match starts, or on Load Deck while the Deck and Hand are empty.

A Deck holds card names, not ids or images. A Deck can name a card the Library does not have yet, which makes a Deck list shareable as plain text before the Player owns the cards. Such cards are listed as missing and skipped when the Deck loads. Importing the `.ddc` file that has them fixes the Deck with no edit.

## Deck list text

The Deck list text in the editor is how a Deck is exported and imported. One card per line:

```text
4x Card A
2 Card B
Card C
```

| Line | Reads as |
| --- | --- |
| `4x Name`, `4X Name`, `4 x Name`, `4× Name` | 4 copies of `Name` |
| `4 Name` | 4 copies of `Name` |
| `Name` | 1 copy of `Name` |
| `0x Name` | not in the Deck |
| blank, or starting with `#` or `//` | ignored |

- Amounts are capped at 99. The same name on several lines (ignoring case) adds up, and the first spelling is kept.
- A name that starts with a number needs its amount spelled out: `1x 1000 Years`. The bare line `1000 Years` reads as 1000 copies of `Years`.
- A name is at most 80 characters. A Deck holds at most 500 different cards, and a Player at most 200 Decks.
- Names match Library cards ignoring case. If the Library has two cards with one name, the first is used.

Copy list puts the text on the clipboard. Apply list replaces the cards in the open Deck with the text, and the panel says which names the Library lacks. Start from a list on the Decks tab makes a new Deck from pasted text.

## Where they come from

- The Decks tab, one card at a time with the amount steppers, or with Deck list text.
- Importing a `.ddc` file whose cards have starter copies. The Deck is named after the file, see `docs/ddc-format.md`.
- The old Deck List. A Library made before Decks existed becomes one Deck named "My Deck" the first time the new version starts, from the copies set on its cards. This runs once. Deleting every Deck is not undone on the next start.

Decks stay on the device like the Library and are never written to the shared board.
