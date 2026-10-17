# Private state lives on the owner's device only

The Hand, Deck List and Deck order never enter the shared Drawdy scene. They are kept on the owner's device, and only the owner can choose to publish a copy (Show Hand, Reveal).

## Why

Anything in the shared scene syncs to every collaborator, and drivers have no private channel between players. Keeping state out of the scene is the only way the opponent cannot read it.

## Consequences

- A Match cannot be resumed on another device. A new device means a new Match.
- Restart starts both Sides over; the Library on each device is kept.
- A single person cannot test both Sides from one browser profile; two profiles or devices are needed.

## Rejected

Honor-system privacy with all state in the scene. It would sync and resume anywhere, but the opponent's client could read the data, so it would hide cards visually without enforcing it.
