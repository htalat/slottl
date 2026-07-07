# slottl — "What Should I Eat?"

A food slot machine: spin a vertical reel to decide what to eat. The owner's
long-term plan is to feed it real personal data — fridge inventory and a
personal recipe list — so keep the data layer and the UI strictly separated.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — type-check (`tsc -b`) + production build; run this to verify changes
- `npm run lint` — oxlint
- `npm run preview` — serve the production build

Stack: Vite, React 19, TypeScript, Tailwind v4 (via `@tailwindcss/vite`,
no tailwind.config — theme lives in `src/index.css` `@theme`), TanStack
Router (code-based routes in `src/main.tsx`, no file-based routegen),
Framer Motion.

## Architecture

```
src/
  main.tsx                     TanStack Router setup (routes defined inline)
  pages/HomePage.tsx           picks a FoodSource, renders <SlotMachine>,
                               toggles the FoodListEditor
  data/
    foodSources.ts             FoodSource type + FOOD_SOURCES registry
    sources/                   one file per food list (classics, fridge, recipes)
                               — these are SEEDS; user edits live in localStorage
    useFoodList.ts             editable list per source, persisted to
                               localStorage (slottl:foods:<sourceId>)
  components/food-editor/
    FoodListEditor.tsx         add/remove/reset UI; pure presentation,
                               raises events, never touches storage
  components/slot-machine/     generic, reusable, data-agnostic UI
    SlotMachine.tsx            composition root; props in, result callback out
    Reel.tsx                   presentation: window, strip, blur, winner glow
                               + attaches browse handlers (drag/wheel/keys)
    ConfettiBurst.tsx          dependency-free win confetti
    useReelSpin.ts             all reel motion: spin animation (tween → bounce →
                               normalize) AND manual browsing (drag / wheel /
                               arrow keys, with snap-to-row)
    useTickSound.ts            WebAudio ticks
    selection.ts               pure math: winner choice + reel geometry (SpinPlan)
    types.ts                   FoodOption = { emoji, label, tint? }
```

Dependency direction: `data/` and `pages/` may import from
`components/slot-machine`; the component must NEVER import from `data/`
or fetch anything. It receives a ready `FoodOption[]` prop.

## Adding / editing food (the common task)

- **In the app** (primary path): "Edit foods" on the HomePage opens
  `FoodListEditor` — add (emoji picker + name), remove, reset. Edits go
  through `useFoodList`, which copies the list into localStorage on
  first edit; from then on the stored copy wins over the seed file.
  "Reset" deletes the copy and returns to the seed.
- **Edit a seed list**: change `src/data/sources/fridge.ts` etc.
  Entries are `{ emoji, label, tint? }`; `tint` is a Tailwind `bg-*-50`
  class (optional; `useFoodList.addFood` auto-cycles tints for new
  items). NOTE: a seed edit is invisible to a browser that already has
  local edits for that source until the user hits Reset.
- **Add a new list**: create `src/data/sources/<name>.ts` exporting a
  `FoodOption[]`, then register it in `FOOD_SOURCES` in
  `src/data/foodSources.ts`. It shows up in the HomePage picker and
  becomes editable automatically. Lists need ≥ 2 items to spin
  (HomePage swaps in an empty-state card below that).
- **Async sources later** (localStorage, API, real fridge/recipe data):
  load in the route's TanStack Router `loader` (or a hook in `pages/`),
  map the rich data down to `FoodOption[]`, and pass it in as a prop.
  Richer domain types (ingredients, recipe links) belong in `data/`,
  never in the component.

## Invariants — do not break these

1. **Deterministic outcome**: the winner and the exact resting pixel are
   computed in `selection.ts::createSpinPlan` BEFORE any animation
   starts. Never move randomness into the animation phase; the tween
   just travels to a precomputed `-targetStep * ITEM_HEIGHT`.
2. **Geometry has one source of truth**: `ITEM_HEIGHT` / `VISIBLE_ROWS`
   in `selection.ts`. All row heights/offsets are inline styles derived
   from them — don't duplicate these as Tailwind classes.
3. **List length is fixed per mount**: `useReelSpin` derives geometry
   from `foods.length`. When switching lists, remount via `key`
   (HomePage does `key={source.id}`).
4. **Accessibility**: the animated reel is `aria-hidden`; the result is
   announced through the `role="status"` live region in
   `SlotMachine.tsx`. `prefers-reduced-motion` gets a short single
   tween, no loops/overshoot/confetti. Keep all of that intact.
5. **No gambling aesthetics** — playful food theme, rounded, soft.

## Animation cheat-sheet (useReelSpin)

Spin = one cubic-bezier tween `[0.32, 0, 0.13, 1]` (ease-in spin-up,
long ease-out tail) that overshoots the target by 0.28 rows, then a
spring (stiffness 320, damping 13) pulls back — that's the bounce.
After settling, the strip position is normalized back into the second
list copy (`y.jump`), which is invisible because the strip repeats with
period `count * ITEM_HEIGHT`. Motion blur is derived from
`useVelocity(y)` in `Reel.tsx`. Ticks fire when a row crosses the
center line (throttled to ≥35ms in `useTickSound`).

**Browsing** (pre-spin): the reel window is focusable and draggable —
pointer drag (with a 4px threshold so taps don't count), wheel/trackpad
(native non-passive listener in `Reel.tsx`), and ArrowUp/Down. While
scrubbing, `setWrapped` keeps y inside the second list copy by shifting
whole periods (invisible). Release snaps to the nearest row (plus a small
velocity flick), then normalizes. Browsing clears the previous result;
the parked food is announced as "Maybe X?" via the live region. `spin()`
reads its starting step live from `y`, so spinning mid-browse still lands
exactly on the planned winner.
