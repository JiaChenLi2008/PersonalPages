import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import { useRevealPanel } from "../../lib/useRevealPanel";

/**
 * 01.2 JHU summer school (ui.pen `EYW9F`): three cards, each one real dissection
 * photo as the puzzle piece, its riddle, and the answer panel behind a button.
 * Photos pair with the riddles in the content-brief order (BLUEPRINT §5):
 * image1 -> sheep brain (q1/a1), image2 -> cow heart and lungs (q2), image3 -> urine bottle (q3).
 *
 * The three cards are one reveal group: opening a card closes the other two
 * (motion spec §3.5). The panel is the hook's wrapper — the card's own bordered box
 * sits inside it, so the height, the border and the answers all grow as one.
 *
 * The shared motion hooks of §4 land here too: `.motion-clip` on the puzzle slot
 * (device ②), `.motion-slide` on the card's ordinal (device ③) and `.motion-hover`
 * on the puzzle button (device ④). `Reveal` is what adds the `.is-in` both
 * clip and slide wait for.
 */
export function ScholarlyJhu() {
  const { text, langOf } = useCopy();
  const card1 = useRevealPanel({
    panelId: "scholarly-jhu-a1",
    triggerId: "scholarly-jhu-q1",
    group: "scholarly-jhu",
  });
  const card2 = useRevealPanel({
    panelId: "scholarly-jhu-a2",
    triggerId: "scholarly-jhu-q2",
    group: "scholarly-jhu",
  });
  const card3 = useRevealPanel({
    panelId: "scholarly-jhu-a3",
    triggerId: "scholarly-jhu-q3",
    group: "scholarly-jhu",
  });

  return (
    <div className="scholarly__sub">
      <div className="scholarly__subhead">
        <p className="scholarly__num" lang={langOf("scholarly-jhu.no")}>
          {text("scholarly-jhu.no")}
        </p>
        <h3 className="scholarly__subtitle" lang={langOf("scholarly-jhu.title")}>
          {text("scholarly-jhu.title")}
        </h3>
      </div>
      <Rule variant="hairline" />

      <div className="scholarly__body scholarly__body--jhu">
        {/* docx page 3 (figures 1 and 2 swapped): the cow heart and lungs card now stands
            before the sheep brain card. The whole card moves — photo, riddle, `alt` and
            panel together — so each photo keeps the answer text that describes it, and each
            `<li>` renders the number of its own position (1, 2, 3 top-down). */}
        {/* The board numbers each card 1/2/3; the dictionaries carry those three strings
            only as the Immunotherapy column numbers (docs/CHROME.md §1 registers no
            separate keys), so the same entries serve both blocks. */}
        {/* The first two photos were shot sideways, so their derivatives are stored turned
            90° clockwise (image2-400 → 301×400, image1-1600 → 1200×1600) and the
            `width`/`height` on those two `<img>` are the turned pixels; the 4:3 slot covers
            the file, so the surplus height crops top and bottom, centred. */}
        <ul className="scholarly__cards motion-reveal-group">
          <li className="scholarly__card">
            <button
              type="button"
              className="scholarly__puzzle scholarly__media scholarly__media--4x3 motion-hover"
              aria-label={text("scholarly-jhu.q2")}
              lang={langOf("scholarly-jhu.q2")}
              {...card2.triggerProps}
            >
              <Reveal as="span" className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/image2-400.webp"
                  alt={text("scholarly-jhu.a2")}
                  width={301}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </button>
            <p className="scholarly__q">
              <Reveal as="span" className="motion-slide">
                <span className="scholarly__onum" lang={langOf("scholarly-immuno.q1.no")}>
                  {text("scholarly-immuno.q1.no")}
                </span>
              </Reveal>
              <span className="scholarly__qtext" lang={langOf("scholarly-jhu.q2")}>
                {text("scholarly-jhu.q2")}
              </span>
            </p>
            <p className="scholarly__hint scholarly__hint--jhu" lang={langOf("scholarly.revealClick")}>
              {text("scholarly.revealClick")}
            </p>
            <div {...card2.panelProps}>
              <div className="motion-reveal-clip">
                <div className="scholarly__panel scholarly__panel--qa">
                  <p
                    className="scholarly__panelLabel motion-answer"
                    data-stagger="1"
                    lang={langOf("scholarly-hir.answerLabel")}
                  >
                    {text("scholarly-hir.answerLabel")}
                  </p>
                  <p
                    className="scholarly__answer scholarly__answer--qa motion-answer"
                    data-stagger="2"
                    lang={langOf("scholarly-jhu.a2")}
                  >
                    {text("scholarly-jhu.a2")}
                  </p>
                </div>
              </div>
            </div>
          </li>

          <li className="scholarly__card">
            <button
              type="button"
              className="scholarly__puzzle scholarly__media scholarly__media--4x3 motion-hover"
              aria-label={text("scholarly-jhu.q1")}
              lang={langOf("scholarly-jhu.q1")}
              {...card1.triggerProps}
            >
              <Reveal as="span" className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/image1-1600.webp"
                  alt={text("scholarly-jhu.a1")}
                  width={1200}
                  height={1600}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </button>
            <p className="scholarly__q">
              <Reveal as="span" className="motion-slide">
                <span className="scholarly__onum" lang={langOf("scholarly-immuno.q2.no")}>
                  {text("scholarly-immuno.q2.no")}
                </span>
              </Reveal>
              <span className="scholarly__qtext" lang={langOf("scholarly-jhu.q1")}>
                {text("scholarly-jhu.q1")}
              </span>
            </p>
            <p className="scholarly__hint scholarly__hint--jhu" lang={langOf("scholarly.revealClick")}>
              {text("scholarly.revealClick")}
            </p>
            <div {...card1.panelProps}>
              <div className="motion-reveal-clip">
                <div className="scholarly__panel scholarly__panel--qa">
                  <p
                    className="scholarly__panelLabel motion-answer"
                    data-stagger="1"
                    lang={langOf("scholarly-hir.answerLabel")}
                  >
                    {text("scholarly-hir.answerLabel")}
                  </p>
                  <p
                    className="scholarly__answer scholarly__answer--qa motion-answer"
                    data-stagger="2"
                    lang={langOf("scholarly-jhu.a1")}
                  >
                    {text("scholarly-jhu.a1")}
                  </p>
                </div>
              </div>
            </div>
          </li>

          <li className="scholarly__card">
            <button
              type="button"
              className="scholarly__puzzle scholarly__media scholarly__media--4x3 motion-hover"
              aria-label={text("scholarly-jhu.q3")}
              lang={langOf("scholarly-jhu.q3")}
              {...card3.triggerProps}
            >
              <Reveal as="span" className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/image3-600.webp"
                  alt={text("scholarly-jhu.a3")}
                  width={600}
                  height={450}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </button>
            <p className="scholarly__q">
              <Reveal as="span" className="motion-slide">
                <span className="scholarly__onum" lang={langOf("scholarly-immuno.q3.no")}>
                  {text("scholarly-immuno.q3.no")}
                </span>
              </Reveal>
              <span className="scholarly__qtext" lang={langOf("scholarly-jhu.q3")}>
                {text("scholarly-jhu.q3")}
              </span>
            </p>
            <p className="scholarly__hint scholarly__hint--jhu" lang={langOf("scholarly.revealClick")}>
              {text("scholarly.revealClick")}
            </p>
            <div {...card3.panelProps}>
              <div className="motion-reveal-clip">
                <div className="scholarly__panel scholarly__panel--qa">
                  <p
                    className="scholarly__panelLabel motion-answer"
                    data-stagger="1"
                    lang={langOf("scholarly-hir.answerLabel")}
                  >
                    {text("scholarly-hir.answerLabel")}
                  </p>
                  <p
                    className="scholarly__answer scholarly__answer--qa motion-answer"
                    data-stagger="2"
                    lang={langOf("scholarly-jhu.a3")}
                  >
                    {text("scholarly-jhu.a3")}
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
