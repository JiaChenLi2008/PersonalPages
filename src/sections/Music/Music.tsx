import { useState } from "react";
import { PhotoStrip, type StripPhoto } from "../../components/PhotoStrip/PhotoStrip";
import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { dictionaries, useCopy, type CopyKey } from "../../i18n/copy";
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
 * both languages in the same slot. The docx asks for a dense grid of small instrument
 * images that turn into the instrument's English name on hover; the user's ruling is text
 * only, so the grid keeps the density and swaps in the *other* language's name instead.
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
 */
const RESUME_ROWS = [
  { date: "music.resume.r01.date", theme: "music.resume.r01.theme", venue: "music.resume.r01.venue" },
  { date: "music.resume.r02.date", theme: "music.resume.r02.theme", venue: "music.resume.r02.venue" },
  { date: "music.resume.r03.date", theme: "music.resume.r03.theme", venue: "music.resume.r03.venue" },
  { date: "music.resume.r04.date", theme: "music.resume.r04.theme", venue: "music.resume.r04.venue" },
  { date: "music.resume.r05.date", theme: "music.resume.r05.theme", venue: "music.resume.r05.venue" },
  { date: "music.resume.r06.date", theme: "music.resume.r06.theme", venue: "music.resume.r06.venue" },
  { date: "music.resume.r07.date", theme: "music.resume.r07.theme", venue: "music.resume.r07.venue" },
  { date: "music.resume.r08.date", theme: "music.resume.r08.theme", venue: "music.resume.r08.venue" },
  { date: "music.resume.r09.date", theme: "music.resume.r09.theme", venue: "music.resume.r09.venue" },
  { date: "music.resume.r10.date", theme: "music.resume.r10.theme", venue: "music.resume.r10.venue" },
  { date: "music.resume.r11.date", theme: "music.resume.r11.theme", venue: "music.resume.r11.venue" },
  { date: "music.resume.r12.date", theme: "music.resume.r12.theme", venue: "music.resume.r12.venue" },
  { date: "music.resume.r13.date", theme: "music.resume.r13.theme", venue: "music.resume.r13.venue" },
  { date: "music.resume.r14.date", theme: "music.resume.r14.theme", venue: "music.resume.r14.venue" },
] as const satisfies readonly Record<"date" | "theme" | "venue", CopyKey>[];

/**
 * Music (03, `SOUND & SOUL`) — the ui.pen frame Z79UYi: section head, 2px baseline, then
 * the wall of photographs the docx adds (页面6), then the pull quote with its key-value row
 * beside the 4:3 photograph, then the twelve-instrument grid (docx-1021 段[1]…[12]), then
 * the performance résumé table (页面6, 14 场).
 *
 * The wall sits between the head and the body: the reader meets the whole impression of the
 * section first and its detail after. The 4:3 photograph keeps its box and its alt key —
 * T1 replaced the file behind `music-fig-720`, not the slot.
 */
export function Music() {
  const { text, langOf } = useCopy();
  /* The instrument grid shows the page's own language by default and the other side of the
     same key while a tile is hovered or focused. One dictionary is read at a time and only
     the shown side reaches the DOM, so neither page ever carries the other language in its
     markup (BLUEPRINT §6.4) — a CSS cross-fade of both texts would. `langOf` names which
     side the page speaks, so no second language hook is needed. */
  const otherSide = langOf("music.perc.01") === "en" ? dictionaries.zh : dictionaries.en;
  const [swappedAt, setSwappedAt] = useState<number | null>(null);
  const release = (index: number) =>
    setSwappedAt((at) => (at === index ? null : at));

  return (
    <section id="music" data-section="music" className="music" aria-labelledby="music-title">
      {/* The head's two texts arrive at the first stagger tier; the kicker carries the
          section number, so it is the block that slides in (motion.css .motion-slide). */}
      <h2 id="music-title" className="music__head">
        <Reveal as="span" className="music__kicker motion-slide">
          {text("music.kicker")}
        </Reveal>
        <Reveal as="span" className="music__title-en">
          {text("music.titleEn")}
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
            be met: threshold 0 is the trigger this hook needs. The box is decorative beside
            the pull quote, so the photograph stays out of the accessibility tree
            (BLUEPRINT §6.3) while its alt text is the dictionary's. */}
        <Reveal as="figure" className="music__fig motion-clip" delay={2} threshold={0}>
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
        </Reveal>
      </div>
      {/* docx-1021 段[1]…[12]: a dense tile grid that swaps to the instrument's other-language
          name. Hover and keyboard focus both drive it (`tabIndex` + onFocus), so the swap is
          not mouse-only; `:focus-visible` in Music.css draws the ring. No transition is
          declared, so `prefers-reduced-motion` has nothing to disable. */}
      <ul className="music__perc">
        {PERCUSSION.map((key, index) => {
          const swapped = swappedAt === index;
          const shown = swapped ? otherSide[key] : { text: text(key), lang: langOf(key) };
          return (
            <li
              key={key}
              className="music__percItem"
              lang={shown.lang}
              tabIndex={0}
              onMouseEnter={() => setSwappedAt(index)}
              onMouseLeave={() => release(index)}
              onFocus={() => setSwappedAt(index)}
              onBlur={() => release(index)}
            >
              {shown.text}
            </li>
          );
        })}
      </ul>
      {/* The résumé table is a scroll region of its own at every width: three columns of
          Chinese sentence-length themes cannot stay legible in a 320px column, so the cells
          wrap and, if a narrow viewport still runs out of room, this box scrolls sideways
          instead of the page. It takes its accessible name from the section heading, which
          is the dictionary's own text — the dictionaries carry no caption key, and inventing
          one is outside this lane. `tabIndex` is what lets a keyboard user reach the box and
          scroll it. */}
      <div
        className="music__resume"
        role="region"
        aria-labelledby="music-title"
        tabIndex={0}
      >
        <table className="music__table">
          <thead>
            <tr>
              {RESUME_HEADS.map((key) => (
                <th key={key} scope="col" className="music__th" lang={langOf(key)}>
                  {text(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESUME_ROWS.map((row) => (
              <tr key={row.date}>
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
