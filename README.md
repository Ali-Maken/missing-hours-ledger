# Hour Debt Ledger — offline

A single-page attendance tracker. Log work blocks, see what time you can log out,
and watch an hour deficit count down to zero by a target date.

Runs entirely on the device. No backend, no build step, no dependencies, no
network requests of any kind — the fonts are the platform's own.

## The three tabs

**Today** answers one question — when can you log out — and carries nothing else
but the blocks you are logging and one quiet status line. **Ledger** is the
review: the balance, two numbers, and a month grid. **Settings** holds every
parameter. Nothing on the Today screen needs configuring, and nothing in
Settings needs looking at daily.

The month grid is both the record and the plan. Past days are shaded green or
red by how far off the day landed; days before the baseline, weekends and
non-working days stay plain; a missed workday shows a dashed amber outline.
Future days are outlines you can tap to mark as leave — which is the point:
booking time off does not shrink the debt, it removes days you could have paid
it with, and the daily figure moves the moment you mark them.

## How the catch-up is calculated

Nothing is stored. On every render the app takes the balance at the end of
yesterday and divides it by the workdays still remaining before the target
date, so the daily ask tracks reality on its own — fall behind and it rises,
because the debt grew *and* the days left shrank. Switch `catchUp` to `fixed`
and it adds a set amount instead; if that will not reach zero in time, the
Ledger says so.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app. HTML, CSS and JS inline, three tabs. ~62 KB. |
| `sw.js` | Service worker. Network-first for the page, cache-first for assets. |
| `manifest.webmanifest` | Makes it installable to the home screen. |
| `icon-*.png` | App icons — 192, 512, maskable 512, and 180 for iOS. |

## Running it

It's static, so any HTTPS host works. Two constraints, both from the browser:

- **Service workers need HTTPS** (or `localhost`). Opening `index.html` as a
  `file://` URL works, but you get no offline caching and no install.
- **Install to home screen needs the manifest served over HTTPS** from the same
  origin as the page.

Locally:

```sh
python3 -m http.server 8899
# then http://localhost:8899/
```

To host it, put these files at the root of a repo and turn on GitHub Pages
(Settings → Pages → Deploy from a branch → `main` / `/`). Nothing here is
personal — the app ships with no figures in it; you enter your starting balance
on first run and it stays in this browser's `localStorage`. Publishing the code
does not publish your hours.

## Installing on the phone

- **iOS / Safari:** open the URL → Share → Add to Home Screen.
- **Android / Chrome:** open the URL → the app shows an Install button, or use
  the ⋮ menu → Install app.

Open it once while online so the service worker caches the shell. After that it
works with no signal.

## Data

Everything is one `localStorage` key, `hourdebt.v1`, plus a `.bak` mirror:

```jsonc
{
  "config": {
    "configured": true,
    "baselineMin": -3863,        // balance in minutes at the end of baselineDate
    "baselineDate": "2026-09-07",
    "targetDate":   "2026-12-31",
    "dayHours": { "0":0, "1":480, "2":480, "3":480, "4":480, "5":450, "6":0 },
    "weekStart": 1,              // 0 Sun, 1 Mon, 6 Sat
    "catchUp": "even",           // "even" spreads the debt | "fixed" adds a set amount
    "fixedExtraMin": 60,
    "roundMin": 5,               // rounding applied to the punch buttons
    "theme": "system",
    "holidays":  ["2026-12-25"]
  },
  "days": {
    "2026-09-08": {
      "type": "work",            // work | leave | holiday | off
      "segments": [ { "start": "10:40", "end": "13:00" },
                    { "start": "14:00", "end": "18:00" } ]
    }
  }
}
```

`dayHours` is keyed by `Date.getDay()` — 0 is Sunday. A weekday set to 0 is a
non-working day: nothing is required, and anything logged on it is pure credit.

Gaps between segments are breaks and are never counted. A segment with an empty
`end` is a running clock-in. A segment whose end is before its start is treated
as crossing midnight.

**It lives in this browser only.** Clearing site data wipes it, and it does not
sync between devices. Settings → *Save backup file* writes a JSON file;
*Restore from file* reads one back.

## The one number that matters

The app is only as accurate as its baseline. Re-enter the figure from the HR
portal every week or two under Settings → *Official balance from the HR portal*,
with the date it covers. Days on or before that date stop counting, so the two
can't drift apart.

## Changing it

Edit `index.html` directly. If you change any file, bump `CACHE` in `sw.js`
(`hour-debt-v5` → `v6`) so installed copies drop the old assets.

The page itself is fetched **network-first**: online you always get the current
deploy on the next load, offline you get the cached copy. Cache-first was the
original design and it was wrong — it served the previous deploy every time, and
because the background refresh went through a plain `fetch()` the browser's own
HTTP cache could answer it with the stale file, so an out-of-date shell could
keep re-caching itself. The install step now fetches with `cache: "reload"` too,
so installing *during* a deploy cannot bake a stale page into a fresh cache.
