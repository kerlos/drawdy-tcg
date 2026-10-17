# The opponent's Side is a locally drawn Mirror

Each Player plays on their own Side at the bottom of their view. Each client draws the opponent's Side as read-only, 180°-rotated preview elements at the top. The driver recomputes the Mirror from synced scene state.

## Why

Drawdy's camera has position and zoom but no rotation, so a Player cannot be given their own bottom seat by rotating the view. Preview elements are local to each client and never synced, so each client can draw its own rotated copy of the opponent.

## Consequences

- The opponent's Cards cannot be selected or moved, which matches the rule that a Player never touches the opponent's Cards.
- The driver must keep every Mirror element in step with the opponent's real elements.
- The Mirror depends on preview elements supporting a 180° rotation. If they do not, this decision must be revisited.

## Rejected

- A shared orientation with Player 2 on top and upright Cards. Simpler, but Player 2 would not get their own bottom seat.
- Rendering the whole table in a webview. Full control, but it replaces Drawdy's native drag, zoom and layering with custom code.
