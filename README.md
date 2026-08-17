# CookBookDG

CookBookDG (CBDG) is a digital cookbook that behaves like a physical one.
Recipes are organized into leather-bound "books" (categories) sitting on a
shelf; opening a book turns to a two-page spread you flip through, resize,
and write on directly. The goal isn't a form for entering recipe data - it's
an object that feels like a cookbook: leather covers, ruled pages, a brass
spine you can drag, photos tipped in like snapshots, and full support for
reading right-to-left in Hebrew.

## Screenshots

_Add screenshots here to give new contributors a quick look at the app._

| Shelf view                   | Book spread                   |
| ---------------------------- | ----------------------------- |
| `docs/screenshots/shelf.png` | `docs/screenshots/spread.png` |

Drop PNG/JPEG files into `docs/screenshots/` and reference them above (the
folder doesn't exist yet - create it when you add the first image).

## Features

- **Categories as leather books** - each recipe category renders as a book
  cover on a shelf, with its own leather color and a live recipe count.
- **Two-page spread** - opening a book shows a real spread (left/right
  pages) rather than a single scrolling form.
- **Resizable pages** - drag the spine, the outer edges, or the bottom edge
  to resize the spread; sizes persist per book and are fully keyboard
  accessible.
- **Structured recipe grid** - ingredients and steps are laid out as a
  table where steps visually group the ingredients/sub-steps that feed into
  them, instead of a flat ingredient list.
- **EN / HE with full RTL** - every string is translated, and the layout
  (including drag directions and photo order) mirrors correctly in Hebrew.
- **Image uploads** - up to two photos per recipe page, downscaled and
  re-encoded in the browser, then uploaded and stored server-side.
- **Explicit Save** - edits are a local draft until you hit Save (or
  Ctrl/Cmd+S); a brass Save bar appears on any page with unsaved changes,
  and leaving a dirty page prompts you to save or discard first.

## Tech stack

**Frontend**
- **Vite** - fast dev server and build, no framework opinions to fight.
- **React 19** - the UI is entirely component/state driven.
- **TypeScript** - the recipe data model (a forest of ingredients/steps,
  see below) benefits a lot from static shape-checking.
- **Tailwind CSS v4** - utility classes keep the leather/paper/brass visual
  language consistent without a separate design-token layer; v4's CSS-based
  `@theme` is used for the display font token.
- **i18next / react-i18next** - mature pluralization (including Hebrew's
  one/two/many/other rules) and a clean `t()` API, rather than hand-rolling
  string tables.

**Backend**
- **.NET 9 Minimal API** (`api/`) - a small set of endpoint groups over
  categories, pages, and images; no MVC controllers or heavier framework
  needed for this surface area.
- **EF Core + Npgsql** - the ingredient/step forest is a self-referencing
  table, loaded flat and rebuilt into a tree in memory (see Architecture).
- **PostgreSQL 17** - categories, pages, the node forest, and image bytes
  (`bytea`) all live here; `docker compose up` runs migrations and seeds it
  automatically in development.

## Getting started

The app now talks to a real API + database - see "Running with Docker"
below for the one-command path that brings up all three services. The
`npm` scripts here are for frontend-only work (component/lint/test/format
loops); `npm run dev` on its own won't have anything to fetch from unless
you also run the API (natively, or via `docker compose up api db`) and
point `VITE_API_PROXY_TARGET` at it - it defaults to the Docker service
hostname (`http://api:8080`), which isn't reachable from outside a
container.

Prerequisites: Node.js 20+ and npm (add Docker Desktop, or the .NET 9 SDK
+ a local Postgres, to run the full stack).

```bash
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check and produce a production build in dist/
npm run preview    # serve the production build locally
npm run test       # run the vitest suite
npm run lint       # eslint
npm run format     # prettier --write
```

## Running with Docker

Three services: `web` (Vite/React) talks to `api` (.NET 9) which talks to
`db` (Postgres 17). `docker compose up` is the only command needed - it
builds all three, waits for Postgres to be healthy, runs EF Core migrations,
and seeds the three starter books (Meat/Bread/Keto) if the database is empty.

```bash
cp .env.example .env           # first time only - sets local Postgres credentials
docker compose up              # dev server with HMR at http://localhost:5173
docker compose up --build      # rebuild after a dependency change
docker compose --profile prod up --build   # production-like build at http://localhost:8080
```

The `web` service bind-mounts the project into the container so editing a
file on the host triggers HMR immediately; `node_modules` is an anonymous
volume so the host's copy (if any) never shadows the image's installed
dependencies. Both `web` (via Vite's dev proxy) and `web-prod` (via nginx)
forward `/api/*` to the `api` service so the browser only ever talks to one
origin - no CORS involved in either mode. The `prod` profile builds the
static bundle and serves it via nginx with SPA-aware routing, so
hard-refreshing a `/book/:categoryId` URL resolves correctly.

Recipe data now persists in Postgres across `docker compose down` / `up`
(a named volume, `db-data`). To reset it entirely:

```bash
docker compose down -v   # drops the db-data volume - next `up` reseeds from empty
```

To add a migration after changing an entity in `api/Entities/`:

```bash
cd api
ConnectionStrings__Default="Host=localhost;Database=cbdg;Username=cbdg;Password=cbdg" \
  dotnet ef migrations add YourMigrationName -o Data/Migrations
```

(The connection string above is only needed so `dotnet ef` can build the
design-time host - it doesn't need to actually reach a database to diff the
model. Migrations run automatically against the real database at API
startup, in Development only.) Commit the generated files in
`api/Data/Migrations/`.

Docker is an addition, not a replacement - the npm scripts below still work
natively for frontend-only work.

## Project structure

```
src/
  App.tsx                    # data router: shelf ("/") and book ("/book/:categoryId")
  main.tsx                   # entry point; loads fonts + i18n before mounting
  index.css                  # Tailwind import, --font-display token, keyframes

  types.ts                   # Category, RecipePage, RecipeImage

  store/
    CookbookStore.ts          # store interface(s) + in-memory implementation
    ApiCookbookStore.ts        # .NET-API-backed implementation (see Architecture)
    CookbookContext.tsx        # provides a CookbookStore over React context
    useCookbook.ts             # hooks: useCategories, usePageSaveState, useSavePage, ...

  recipeGrid/                # the ingredient/step forest model (see Architecture)
    types.ts                   # Ingredient, Step, RecipeNode
    factory.ts                  # node constructors (real UUIDs - see Architecture)
    treeOps.ts                   # add/remove/move/combine/ungroup on the forest
    grid.ts                       # forest -> rectangular grid cells (rowSpan/colSpan)
    migrate.ts                     # upgrades pages saved by older versions of the app

  components/
    shelf/                     # ShelfView, BookCover, AddCategoryCard, ShelfRow
    book/
      BookView.tsx               # book route: header, spread, page-turn/keyboard nav,
                                  # Ctrl/Cmd+S, beforeunload guard, navigation blocker
      Spread.tsx                  # two Pages + the draggable spine divider
      Page.tsx                     # one page: title/meta fields + RecipeGrid + SaveBar
      SaveBar.tsx                   # per-page dirty/saving/saved/error bar
      UnsavedChangesDialog.tsx       # Save/Discard/Cancel when leaving a dirty page
      ResizeHandle.tsx              # shared pointer/keyboard drag handle
      RecipeGrid.tsx                 # ingredients/steps table + setup + notes
      RecipeGridTable.tsx             # desktop grid rendering (rowSpan cells)
      RecipeGridMobile.tsx             # mobile: flat outline instead of a table
      RecipeGridFields.tsx              # shared input styles used by the grid
      RecipeGridSetup.tsx                # free-text prep steps above the grid
      RecipeImages.tsx                    # upload UI, drop zone, 1-2 photo layout
      RecipeImageLightbox.tsx              # focus-trapped full-size image view
      imageActions.ts                       # per-page image action bindings
    LanguageToggle.tsx, ConfirmDialog.tsx  # small shared UI pieces

  imageProcessing.ts         # canvas downscale/re-encode pipeline for uploads
  recipeUtils.ts             # hasRecipeContent / countRecipes (drives "EMPTY")
  leather.ts                 # per-category leather color palette

  i18n/
    index.ts                  # i18next init (en default, he available)
    locales/en.json, he.json    # all user-facing strings
    useSerifFont.ts               # body serif stack, swaps for Hebrew
    useSyncDocumentDirection.ts    # keeps <html dir/lang> in sync with i18next

api/                        # .NET 9 Minimal API
  Program.cs                  # DI, CORS, dev-only auto-migrate + seed, endpoint mapping
  Entities/                   # Category (+ owned BookLayout), RecipePage, SetupStep,
                               # RecipeNode (self-referencing), RecipeImage
  Data/
    CookbookDbContext.cs        # EF Core model config, cascade deletes
    NodeTree.cs                  # flat RecipeNode rows <-> nested tree DTO (in memory)
    DbSeeder.cs                   # Meat/Bread/Keto + sample recipe, empty-db only
    Migrations/                   # committed EF Core migrations
  Dtos/                        # wire types shared in shape with the frontend's
  Endpoints/                   # CategoriesEndpoints, PagesEndpoints, ImagesEndpoints,
                               # HealthEndpoints
```

## Architecture

Three ideas explain most of the non-obvious decisions in this codebase.

### 1. The `CookbookStore` abstraction, and `ApiCookbookStore`

Components never read or write recipe data directly - they go through
`CookbookStore` (`src/store/CookbookStore.ts`), accessed via hooks in
`useCookbook.ts`. Two implementations exist: `InMemoryStore` (a plain array,
kept around for tests/offline use) and `ApiCookbookStore`
(`src/store/ApiCookbookStore.ts`), which the app actually runs against -
swapped in once, at `src/store/context.ts`. Every component call site
(`updatePage`, `addImage`, ...) is unchanged by that swap; only the store
implementation knows the data goes over HTTP now.

`ApiCookbookStore` keeps a local cache so reads (`getCategories`,
`getCategory`) stay synchronous, same as `InMemoryStore` - network fetches
run in the background and update the cache via `notify()`. Content edits
(title, ingredients, notes, setup, captions) only touch a local draft; nothing
reaches the server until an explicit Save, tracked by comparing the draft
against a per-page "last saved" snapshot (`PersistentCookbookStore` in
`CookbookStore.ts` - the extra `savePage`/`getPageSaveState` surface the Save
bar reads from). Two things intentionally *don't* wait for Save:

- **Images** upload/delete immediately through their own endpoints (binary
  content can't ride in a JSON payload) - only a photo's *caption* is
  draft-tracked, since there's no dedicated caption endpoint.
- **Book layout** (spread size/ratio) PATCHes after a short idle debounce,
  approximating "save on drag end" - it's a display preference, not recipe
  content, so it never participates in dirty state.

New entities (categories, pages, images) get a client-generated UUID
(`crypto.randomUUID()`) at creation time rather than waiting for the server
to assign one. That's also why `recipeGrid/factory.ts`'s node ids switched
from a counter scheme to real UUIDs - a node built locally and one that's
round-tripped through a page save carry the same id, so there's no
temp-id-to-real-id reconciliation anywhere in the store.

### 2. The recipe grid forest model

A recipe's ingredients and steps (`RecipePage.nodes`, in
`src/recipeGrid/`) are **not** two separate lists. They're a single ordered
forest: each node is either an `Ingredient` (a leaf) or a `Step` (an
internal node whose `children` are the ingredients/sub-steps that feed into
it). Reading the forest left-to-right and depth-first gives you the
ingredient column top-to-bottom, exactly as it should read in a printed
recipe.

The grid table you see on screen is _derived_, not stored: `grid.ts` walks
the forest and computes a rectangular layout of cells with `rowSpan`/
`colSpan` (`buildGrid`), the same way you'd lay out an HTML table by hand.
Nothing about row spans is persisted - it's recomputed from the forest on
every render, so `treeOps.ts` (combine, ungroup, move, remove) only ever has
to keep the _tree_ consistent, never a derived layout in sync with it.

### 3. The node forest as a self-referencing table

The backend stores that same forest as a flat `RecipeNode` table
(`ParentId` nullable, self-referencing; ordering within a parent via
`Ordinal`) rather than a JSON blob or a recursive structure - `api/Data/
NodeTree.cs` is the only place that walks it as a tree, converting flat
rows to/from the nested DTO the frontend already speaks. A whole-page Save
(`PUT /api/pages/{id}`) replaces a page's node rows wholesale rather than
diffing the tree - simpler than patch semantics for a tree, and cheap
enough at recipe-card scale. That endpoint also carries an `updatedAt`
timestamp from the client's last-loaded copy; if the stored row is newer,
the save is rejected with 409 rather than silently overwriting a change
made elsewhere - `SaveBar` surfaces that as an error with a Retry action.

## Internationalization

All strings live in `src/i18n/locales/en.json` and `he.json`, loaded by
`src/i18n/index.ts`. To add a language:

1. Add `src/i18n/locales/<code>.json` with the same key structure as
   `en.json` (nested objects mirror the `t('a.b.c')` calls in components).
2. Register it in `src/i18n/index.ts`'s `resources` map.
3. Add a toggle/option wherever `LanguageToggle.tsx` switches languages.
4. If the language uses plural forms other than English's one/other (Hebrew
   needs one/two/many/other), add the matching `_one`/`_two`/`_many`/
   `_other`/`_zero` suffixed keys - i18next picks the right one via
   `Intl.PluralRules`, so components should never branch on count
   themselves.

RTL considerations, if the new language is right-to-left:

- Use logical Tailwind properties (`start`/`end`, `ps-`/`pe-`, `border-s`)
  instead of `left`/`right`, exactly as the existing components do - they
  flip automatically with `dir`.
- `useSyncDocumentDirection` sets `<html dir>` from `i18n.dir()` - don't set
  direction anywhere else.
- Anything with an inherent screen-space meaning (drag deltas, flip
  animation offsets, DogEar page-turn corners) has to be mirrored
  explicitly against `isRtl`, since CSS logical properties don't cover
  pointer math. `Spread.tsx` and `BookView.tsx`'s resize handlers are the
  reference examples.
- Pick a font stack with real coverage for the script (see
  `useSerifFont.ts` and the `--font-display` token in `index.css`) - don't
  rely on a Latin font's fallback glyphs.

## Known limitations / roadmap

- **No auth.** There's no concept of a user or ownership; anyone who can
  reach the API can read or write everything.
- **No undo.** Deleting a book, a page, an ingredient, or an image is
  immediate (books ask for confirmation; most other deletes don't).
- **Image upload/remove don't go through Save.** They hit the API
  immediately (see Architecture #1) - only a photo's caption is part of the
  page draft/Save cycle. A page mid-edit that you navigate away from without
  saving keeps any images you added in that session; only the text fields,
  ingredient tree, and captions revert.
- **Optimistic writes can go stale on failure.** Category/page creation and
  image upload apply locally first and roll back on a failed request
  (logged to the console); there's currently no UI toast surfacing that
  failure beyond the item disappearing again.

## License

MIT - see [LICENSE](LICENSE).
