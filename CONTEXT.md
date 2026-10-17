# Drawdy TCG Tabletop

A two-player trading card game tabletop on a shared Drawdy board. Play is manual: players move cards by hand and no game rules are enforced.

## Language

**Match**:
One play session between two Players. A Match lives on the device each Player started it on and cannot be resumed from another device; a new device means a new Match.
_Avoid_: Game, Session

**Restart**:
Ending the Match and returning both Sides to the start of the Match: every Card back in its Deck, the Play Areas emptied, the Library kept.

**Player**:
A person at the table. Exactly two Players share a board, each on their own device. A third person is a spectator and sees no private Cards.

**Side**:
The part of the table belonging to one Player. A Player plays on their own Side and always sees it at the bottom of their view.

**Mirror**:
A read-only, upside-down copy of the opponent's Side shown at the top of a Player's view, as if sitting across a real table. A Player never moves the opponent's Cards.

**Play Area**:
Where a Player plays their Cards on their Side. Cards can be put anywhere in it. It holds the Deck, the Discard Pile, and anything the Player has played.

**Library**:
The Player's private database of Cards, kept apart from the Play Area. It holds the Cards, the Token List and the Custom Card List, and is filled by importing Card Files. Cards are never played from the Library directly; they enter the Play Area as copies.

**Card File**:
A `.ddc` file holding Cards with their images, used to share Cards between Players. Importing merges it into the Library; it never replaces it. A Card is identified by its name, so a Card File with a known name updates that Card. A Card File that lists copies also gives the Player a Deck List named after the file.

**Card**:
A single image with a name. The game it belongs to is irrelevant.

**Card Back**:
The Drawdy-logo image shown when a Card is face-down.

**Deck List**:
A named list of Library Cards and how many of each, built and chosen in the Decks tab and shared as text (`4x Card Name`). It refers to Cards by name. The chosen Deck List fills the Deck when a Match starts. Never visible to the other Player. The panel just calls it a Deck where the context is clear.
_Avoid_: Deck in play talk (a Deck List is not the pile on the table)

**Creator**:
The panel tab where a Player makes Cards from images or text, then adds them to the Library or exports them as a Card File.

**Deck**:
The face-down, shuffled draw pile in the Play Area.

**Hand**:
A Player's private Cards. The other Player cannot see them unless the owner shows them.

**Show Hand**:
The owner makes their Hand visible to the opponent. Only the Hand's owner can do this; the opponent cannot reveal it themselves.

**Discard Pile**:
The face-up pile of discarded Cards in the Play Area.

**Token**:
A reusable Card template, such as a counter or summoned creature. Taking one puts a copy in the Play Area; it does not come from the Deck.

**Token List**:
The Library section holding a Player's Token templates.

**Custom Card**:
A Card with no built-in behaviour, used for things like life.

**Custom Card List**:
The Library section holding a Player's Custom Card templates.

**Draw**:
Move the top Card of the Deck to the Hand.

**Peek**:
Look at Cards privately without changing anything: a face-down Card in the Play Area, or the top N Cards of the Deck. The opponent is told the Peek happened but not what was seen.

**Reveal**:
Show Cards to both Players without drawing them. Revealing from the Deck turns the top N Cards face-up in a display area beside the Deck. Afterwards each Card goes back on top, back on the bottom, to the Hand, or to the Discard Pile.

**Mulligan**:
Return the Hand to the Deck, shuffle, and draw again. The number drawn is chosen by the Player and defaults to the size of the Hand just returned.

**Search**:
Look through the Deck for a specific Card. The opponent is told a Search happened.

**Action Log**:
The record of what each Player did, visible to both, so that private actions like Peek and Search cannot pass unnoticed.
