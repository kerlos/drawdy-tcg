# The Library is filled from .ddc files, and Decks name their cards

Cards no longer go into the Library one image at a time. The Library tab imports `.ddc` files and removes cards. Making cards is the Creator tab, which writes a `.ddc` or adds its cards to the Library. A Deck is a separate, named list of card names and amounts, built on the Decks tab.

## Why

The `.ddc` file already carries images, names and copies, so adding images by hand in the Library duplicated it. Authoring and playing are different jobs. A Library that is only filled from files is a plain database. Making cards moves to the Creator, so the Library list stays short and safe to browse.

A Deck had been the "copies" number on each Library card, which allowed one Deck. Players keep several, share Deck lists as text (`4x Card Name`), and change them often, so Decks became their own records.

## Decisions

- **A Deck refers to cards by name, not id.** Ids are device-local and regenerate on import. Names are what a Player types in a Deck list, and what survives re-importing a card with new art. The cost is that two cards in one section cannot share a name.
- **A card is identified by its name in its section.** This changes the merge rule of ADR 0003, which matched on name and image. A re-import with new art now replaces the image on the same card. The old rule would have left two cards with one name, and a Deck could not tell which it meant.
- **An import makes a Deck, but never overwrites one.** A file with starter copies creates a Deck named after the file. If a Deck of that name exists it is left alone and the panel says so. The alternative, replacing it, would silently discard edits.
- **A Deck may list cards the Library lacks.** It keeps them and shows them as missing, so a Deck list can be pasted before the cards are imported. They are skipped on load.
- **The Creator draft is stored on the device** (`draft-*`) and survives closing the panel. "Add to my Library" sends it through the same import path as a file, so the draft gets the same checks and the same Deck.
- **The `.ddc` format does not change.** `count` already meant copies. Only what an import does with it changed, so there is no version bump.
- **Existing Libraries migrate.** On first start without stored Decks, the old Deck List counts become a Deck named "My Deck". The cards stay in the Library.

## Consequences

- The Library has no add controls. A Player with images and no `.ddc` makes one in the Creator.
- Re-importing a changed file updates cards by name but leaves the Deck the file created before alone. Delete that Deck first to get the new one.
- A Library that already has two same-name cards (possible before this change) keeps both, but Decks and imports only reach the first.
- Deck edits post the whole Deck list to the driver, and Library or draft edits post the whole list of that kind with its images. This is simple and fine at the sizes of a play session, but a Library near the 2000 card cap will feel it.

## Rejected

- Keeping copies on the Library card. It allows one Deck and mixes card data with play choices.
- Deck cards by id. Not shareable as text.
- Replacing a Deck on re-import. Loses edits without asking.
- A separate Deck file format. A Deck list is text and a `.ddc` already makes one.
