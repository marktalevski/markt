// The page menu in the top-right corner: four page dots in 24px columns, then the three small dots to come in 16px columns, 12px in from
// the right and top edges. Pages that draw their own dots (Home's strokes end on them) take the positions from here, so they land exactly
// where the HTML menu puts them. navAt(W, k): the centre of dot k on a screen W wide
export const NAV_X = { home: 12, freediving: 36, sound: 60, journal: 84, c4: 104, c5: 120, c6: 136 };
export const NAV_W = 156, NAV_Y = 28;
export const navAt = (W, k) => [W - NAV_W + NAV_X[k === 'ink' ? 'home' : k], NAV_Y];
