import { useState } from "react";
import { Lightbox } from "../../components/Lightbox/Lightbox";
import { PhotoStrip, type StripPhoto } from "../../components/PhotoStrip/PhotoStrip";
import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy, type CopyKey } from "../../i18n/copy";
import "./Music.css";

/**
 * The nine photographs of the wall the docx adds to this section (页面6, "依次滚动播放").
 * Names and intrinsic sizes are the contract's own: docs/copy-*.json carry no alt key for
 * these slots, so the wall is decoration and the photographs say nothing (see PhotoStrip).
 */
const MUSIC_WALL = [
  { src: "media/music-wall-1.webp", width: 360, height: 240 },
  { src: "media/music-wall-2.webp", width: 360, height: 540 },
  { src: "media/music-wall-3.webp", width: 360, height: 540 },
  { src: "media/music-wall-4.webp", width: 360, height: 540 },
  { src: "media/music-wall-5.webp", width: 360, height: 240 },
  { src: "media/music-wall-6.webp", width: 360, height: 240 },
  { src: "media/music-wall-7.webp", width: 360, height: 240 },
  { src: "media/music-wall-8.webp", width: 360, height: 240 },
  { src: "media/music-wall-9.webp", width: 360, height: 240 },
] as const satisfies readonly StripPhoto[];

/**
 * The twelve percussion instruments of docx-1021 段[1]…段[12] — one key per instrument,
 * both languages in the same slot. Each tile carries its cartoon instrument drawing
 * (public/media/percussion/<slug>.svg) and the page's own name; hovering or focusing the
 * tile swaps the name for the other language's, which is the English name on the zh page.
 * Every key is spelled out: tools/verify-copy-wiring.mjs only sees a dictionary key it can
 * read as a string literal.
 */
const PERCUSSION = [
  "music.perc.01",
  "music.perc.02",
  "music.perc.03",
  "music.perc.04",
  "music.perc.05",
  "music.perc.06",
  "music.perc.07",
  "music.perc.08",
  "music.perc.09",
  "music.perc.10",
  "music.perc.11",
  "music.perc.12",
] as const satisfies readonly CopyKey[];

/** One drawing per key above, in the same order: a tile and its picture cannot drift apart
    without tools/verify-music-sport-dom.mjs naming the pair. */
const PERCUSSION_ART = [
  "01-handpan",
  "02-marimba",
  "03-drum-kit",
  "04-timpani",
  "05-cymbals",
  "06-vibraphone",
  "07-tubular-bells",
  "08-xylophone",
  "09-glockenspiel",
  "10-tambourine",
  "11-clapper",
  "12-congas",
] as const;

/** The table's three column names (docx 段[11]). */
const RESUME_HEADS = [
  "music.resume.head.date",
  "music.resume.head.theme",
  "music.resume.head.venue",
] as const satisfies readonly CopyKey[];

/**
 * The fourteen performances of the docx table (段[12]…段[25]), already in date-descending
 * order — r01 is Sep 2026 and r14 is Sep 2023, and both dictionaries carry the same row
 * order, so the page never re-sorts a row and never pairs one language's date with the
 * other language's venue. Every key is spelled out: tools/verify-copy-wiring.mjs only
 * sees a dictionary key it can read as a string literal.
 *
 * `dateOrder` is the numeric sort key (year × 12 + month), kept beside the keys so the head
 * button can flip the table without parsing the rendered date string — the zh dictionary
 * writes `2026年9月`, which no `Date` constructor accepts.
 */
const RESUME_ROWS = [
  { date: "music.resume.r01.date", theme: "music.resume.r01.theme", venue: "music.resume.r01.venue", dateOrder: 2026 * 12 + 8 },
  { date: "music.resume.r02.date", theme: "music.resume.r02.theme", venue: "music.resume.r02.venue", dateOrder: 2026 * 12 + 5 },
  { date: "music.resume.r03.date", theme: "music.resume.r03.theme", venue: "music.resume.r03.venue", dateOrder: 2026 * 12 + 5 },
  { date: "music.resume.r04.date", theme: "music.resume.r04.theme", venue: "music.resume.r04.venue", dateOrder: 2025 * 12 + 11 },
  { date: "music.resume.r05.date", theme: "music.resume.r05.theme", venue: "music.resume.r05.venue", dateOrder: 2025 * 12 + 11 },
  { date: "music.resume.r06.date", theme: "music.resume.r06.theme", venue: "music.resume.r06.venue", dateOrder: 2025 * 12 + 5 },
  { date: "music.resume.r07.date", theme: "music.resume.r07.theme", venue: "music.resume.r07.venue", dateOrder: 2025 * 12 + 5 },
  { date: "music.resume.r08.date", theme: "music.resume.r08.theme", venue: "music.resume.r08.venue", dateOrder: 2025 * 12 + 3 },
  { date: "music.resume.r09.date", theme: "music.resume.r09.theme", venue: "music.resume.r09.venue", dateOrder: 2025 * 12 + 0 },
  { date: "music.resume.r10.date", theme: "music.resume.r10.theme", venue: "music.resume.r10.venue", dateOrder: 2024 * 12 + 9 },
  { date: "music.resume.r11.date", theme: "music.resume.r11.theme", venue: "music.resume.r11.venue", dateOrder: 2024 * 12 + 6 },
  { date: "music.resume.r12.date", theme: "music.resume.r12.theme", venue: "music.resume.r12.venue", dateOrder: 2024 * 12 + 5 },
  { date: "music.resume.r13.date", theme: "music.resume.r13.theme", venue: "music.resume.r13.venue", dateOrder: 2024 * 12 + 0 },
  { date: "music.resume.r14.date", theme: "music.resume.r14.theme", venue: "music.resume.r14.venue", dateOrder: 2023 * 12 + 8 },
] as const satisfies readonly Record<"date" | "theme" | "venue" | "dateOrder", CopyKey | number>[];

/**
 * Music (03, `SOUND & SOUL`) — the ui.pen frame Z79UYi: section head, 2px baseline, then
 * the wall of photographs the docx adds (页面6), then the pull quote with its key-value row
 * beside the 4:3 photograph, then the twelve-instrument grid (docx-1021 段[1]…[12]), then
 * the performance résumé table (页面6, 14 场).
 *
 * The wall sits between the head and the body: the reader meets the whole impression of the
 * section first and its detail after. The 4:3 photograph keeps its box and its alt key —
 * T1 replaced the file behind `music-fig-720`, not the slot — and it is the click-to-enlarge
 * slot: the shared `Lightbox` enlarges that same 720 file, not a second tier of it.
 *
 * docx-1023 段[2]…[6] add two pieces of copy this section did not render: three lines between
 * the pull-quote body and the twelve drawings (“点开下面的图片就能看到是哪些” introduces
 * them), and two lines between those drawings and the performance résumé.
 */
export function Music() {
  const { text, langOf } = useCopy();
  /* The résumé table opens in the dictionary's own order (date-descending, the docx's order)
     and the head button flips it. Sorting by the numeric key beside each row keeps the two
     languages in step: the zh dictionary writes `2026年9月`, which Date cannot parse. */
  const [ascending, setAscending] = useState(false);
  const rows = ascending ? [...RESUME_ROWS].reverse() : RESUME_ROWS;
  const sortDirection = ascending ? "ascending" : "descending";
  const toggleSort = () => setAscending((value) => !value);

  return (
    <section id="music" data-section="music" className="music" aria-labelledby="music-title">
      {/* docx-1023 item 8 (user ruling): drop the right-hand duplicate title, kicker 14px/--c-blue.
          The kicker alone names the section; it stays the one block that slides in. */}
      <h2 id="music-title" className="music__head">
        <Reveal as="span" className="music__kicker motion-slide">
          {text("music.kicker")}
        </Reveal>
      </h2>
      <Rule variant="baseline" />
      <PhotoStrip name="music-wall" photos={MUSIC_WALL} />
      <div className="music__body">
        <Reveal as="div" className="music__col" delay={1}>
          <div className="music__pull">
            <span className="music__pull-rule" aria-hidden="true" />
            <p className="music__pull-text" lang={langOf("music.body")}>
              {text("music.body")}
            </p>
          </div>
          <dl className="music__kv motion-hover">
            <dt className="music__k" lang={langOf("hero.key.instrument")}>
              {text("hero.key.instrument")}
            </dt>
            <dd className="music__v" lang={langOf("hero.val.instrument")}>
              {text("hero.val.instrument")}
            </dd>
          </dl>
        </Reveal>
        {/* The figure sweeps in under its clip-path mask one tier behind the text column.
            A clipped element has no visible area, so the 15% observer default could never
            be met: threshold 0 is the trigger this hook needs. The box stays decorative
            (BLUEPRINT §6.3) while its alt key becomes the lightbox trigger's accessible
            name — the photograph is named once, by the control, never twice. */}
        <Reveal as="figure" className="music__fig motion-clip" delay={2} threshold={0}>
          <Lightbox
            src="media/music-fig-720.webp"
            alt={text("music.fig.alt")}
            width={720}
            height={540}
          >
            <div className="music__media" aria-hidden="true">
              <img
                className="music__photo"
                src="media/music-fig-720.webp"
                alt={text("music.fig.alt")}
                width={720}
                height={540}
                loading="lazy"
                decoding="async"
              />
            </div>
          </Lightbox>
        </Reveal>
      </div>
      {/* docx-1023 段[2]…[4]: the three lines that introduce the twelve drawings below.
          Same column and colour as `.music__body`, one step tighter on the leading (13px on
          1.3, 10px apart), so the intro reads as the body's continuation and not as a new
          text tier. */}
      <div className="music__intro">
        <p lang={langOf("music.intro.p1")}>{text("music.intro.p1")}</p>
        <p lang={langOf("music.intro.p2")}>{text("music.intro.p2")}</p>
        <p lang={langOf("music.intro.p3")}>{text("music.intro.p3")}</p>
      </div>
      {/* docx-1021 段[1]…[12]: a small, dense grid of cartoon instrument drawings — the docx
          asks for the drawing to turn into the instrument's English name on hover
          ("从图片变成乐器的英文"). Default state is the drawing alone; hovering or focusing the
          tile fades the drawing out and the name in. The name is the tile's own dictionary
          entry, so it always speaks the page's language — the English page reads English,
          the Chinese page reads Chinese. Hover and keyboard focus both drive it purely in
          CSS (`:hover` / `:focus-visible`), so no state and no JS listener is involved and
          the swap is not mouse-only; `:focus-visible` in Music.css also draws the ring. Both
          drawing and name stay in the DOM (opacity swap), so the name is the tile's
          accessible label in every state and the drawing stays decorative. The cross-fade
          uses the frozen duration/easing tokens; global.css zeroes transitions under
          `prefers-reduced-motion`, which leaves an instant swap. */}
      <ul className="music__perc">
        {PERCUSSION.map((key, index) => (
          <li key={key} className="music__percItem" tabIndex={0}>
            <img
              className="music__percArt"
              src={`media/percussion/${PERCUSSION_ART[index]}.svg`}
              alt=""
              aria-hidden="true"
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
            />
            <span className="music__percName" lang={langOf(key)}>
              {text(key)}
            </span>
          </li>
        ))}
      </ul>
      {/* The résumé table is a scroll region of its own at every width: three columns of
          Chinese sentence-length themes cannot stay legible in a 320px column, so the cells
          wrap and, if a narrow viewport still runs out of room, this box scrolls sideways
          instead of the page. It takes its accessible name from the section heading, which
          is the dictionary's own text — the dictionaries carry no caption key, and inventing
          one is outside this lane. `tabIndex` is what lets a keyboard user reach the box and
          scroll it. */}
      {/* docx-1023 段[5]…[6]: two lines that hand the reader to the table. The second one is
          the muted tail of the pair, the same emphasis pairing `.music__k` / `.music__v`
          uses below — no new size. */}
      <div className="music__intro music__intro--resume">
        <p lang={langOf("music.resume.intro1")}>{text("music.resume.intro1")}</p>
        <p lang={langOf("music.resume.intro2")}>{text("music.resume.intro2")}</p>
      </div>
      <div
        className="music__resume"
        role="region"
        aria-labelledby="music-title"
        tabIndex={0}
      >
        <table className="music__table">
          <colgroup>
            <col className="music__colDate" />
            <col className="music__colTheme" />
            <col />
          </colgroup>
          <thead>
            <tr>
              {RESUME_HEADS.map((key, at) => (
                <th key={key} scope="col" className="music__th" lang={langOf(key)} aria-sort={at === 0 ? sortDirection : undefined}>
                  {/* Only the date column sorts: it is the table's own order, and a second
                      sortable column would need a second key to be honest about. */}
                  {at === 0 ? (
                    <button type="button" className="music__sort" onClick={toggleSort}>
                      {text(key)}
                    </button>
                  ) : (
                    text(key)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="music__row" tabIndex={0}>
                <td className="music__td music__td--date" lang={langOf(row.date)}>
                  {text(row.date)}
                </td>
                <td className="music__td" lang={langOf(row.theme)}>
                  {text(row.theme)}
                </td>
                <td className="music__td" lang={langOf(row.venue)}>
                  {text(row.venue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
