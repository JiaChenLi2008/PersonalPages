import { Rule } from "../../components/primitives/Rule";
import { useCopy } from "../../i18n/copy";
import { useReveal } from "./useReveal";

/**
 * 01.2 JHU summer school (ui.pen `EYW9F`): three cards, each one real dissection
 * photo as the puzzle piece, its riddle, and the answer panel behind a button.
 * Photos pair with the riddles in the content-brief order (BLUEPRINT §5):
 * image1 -> sheep brain (q1/a1), image2 -> cow heart and lungs (q2), image3 -> urine bottle (q3).
 */
export function ScholarlyJhu() {
  const { text, langOf } = useCopy();
  const card1 = useReveal("scholarly-jhu-a1");
  const card2 = useReveal("scholarly-jhu-a2");
  const card3 = useReveal("scholarly-jhu-a3");

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
        <ul className="scholarly__cards">
          <li className="scholarly__card">
            <button
              type="button"
              className="scholarly__puzzle scholarly__media scholarly__media--4x3"
              id="scholarly-jhu-q1"
              aria-label={text("scholarly-jhu.q1")}
              {...card1.triggerProps}
            >
              <img
                className="scholarly__photo"
                src="./media/image1-1600.webp"
                alt={text("scholarly-jhu.a1")}
                width={1600}
                height={1200}
                loading="lazy"
                decoding="async"
              />
            </button>
            {/* The board numbers each card 1/2/3; the dictionaries carry those three
                strings only as the Immunotherapy column numbers (docs/CHROME.md §1
                registers no separate keys), so the same entries serve both blocks. */}
            <p className="scholarly__q">
              <span className="scholarly__onum" lang={langOf("scholarly-immuno.q1.no")}>
                {text("scholarly-immuno.q1.no")}
              </span>
              <span className="scholarly__qtext" lang={langOf("scholarly-jhu.q1")}>
                {text("scholarly-jhu.q1")}
              </span>
            </p>
            <div
              className="scholarly__panel scholarly__panel--qa"
              role="region"
              aria-labelledby="scholarly-jhu-q1"
              {...card1.panelProps}
            >
              <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
                {text("scholarly-hir.answerLabel")}
              </p>
              <p className="scholarly__answer scholarly__answer--qa" lang={langOf("scholarly-jhu.a1")}>
                {text("scholarly-jhu.a1")}
              </p>
            </div>
          </li>

          <li className="scholarly__card">
            <button
              type="button"
              className="scholarly__puzzle scholarly__media scholarly__media--4x3"
              id="scholarly-jhu-q2"
              aria-label={text("scholarly-jhu.q2")}
              {...card2.triggerProps}
            >
              <img
                className="scholarly__photo"
                src="./media/image2-400.webp"
                alt={text("scholarly-jhu.a2")}
                width={400}
                height={301}
                loading="lazy"
                decoding="async"
              />
            </button>
            <p className="scholarly__q">
              <span className="scholarly__onum" lang={langOf("scholarly-immuno.q2.no")}>
                {text("scholarly-immuno.q2.no")}
              </span>
              <span className="scholarly__qtext" lang={langOf("scholarly-jhu.q2")}>
                {text("scholarly-jhu.q2")}
              </span>
            </p>
            <div
              className="scholarly__panel scholarly__panel--qa"
              role="region"
              aria-labelledby="scholarly-jhu-q2"
              {...card2.panelProps}
            >
              <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
                {text("scholarly-hir.answerLabel")}
              </p>
              <p className="scholarly__answer scholarly__answer--qa" lang={langOf("scholarly-jhu.a2")}>
                {text("scholarly-jhu.a2")}
              </p>
            </div>
          </li>

          <li className="scholarly__card">
            <button
              type="button"
              className="scholarly__puzzle scholarly__media scholarly__media--4x3"
              id="scholarly-jhu-q3"
              aria-label={text("scholarly-jhu.q3")}
              {...card3.triggerProps}
            >
              <img
                className="scholarly__photo"
                src="./media/image3-600.webp"
                alt={text("scholarly-jhu.a3")}
                width={600}
                height={450}
                loading="lazy"
                decoding="async"
              />
            </button>
            <p className="scholarly__q">
              <span className="scholarly__onum" lang={langOf("scholarly-immuno.q3.no")}>
                {text("scholarly-immuno.q3.no")}
              </span>
              <span className="scholarly__qtext" lang={langOf("scholarly-jhu.q3")}>
                {text("scholarly-jhu.q3")}
              </span>
            </p>
            <div
              className="scholarly__panel scholarly__panel--qa"
              role="region"
              aria-labelledby="scholarly-jhu-q3"
              {...card3.panelProps}
            >
              <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
                {text("scholarly-hir.answerLabel")}
              </p>
              <p className="scholarly__answer scholarly__answer--qa" lang={langOf("scholarly-jhu.a3")}>
                {text("scholarly-jhu.a3")}
              </p>
            </div>
          </li>
        </ul>

        <p className="scholarly__hint" lang={langOf("scholarly.revealTap")}>
          {text("scholarly.revealTap")}
        </p>
      </div>
    </div>
  );
}
