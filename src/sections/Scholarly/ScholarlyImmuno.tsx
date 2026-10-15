import { Rule } from "../../components/primitives/Rule";
import { useCopy } from "../../i18n/copy";
import { useReveal } from "./useReveal";

/**
 * 01.3 Immunotherapy Studies (ui.pen `H1VYtj`): three equal columns, each a 40×3
 * accent rule, its numbered question button, and the answer panel behind it.
 * Click and keyboard are the whole interaction — the board's `SWIPE → REVEAL`
 * hint stays a label, so no gesture exists that could be the only path (BLUEPRINT
 * §4#4's scroll-snap carousel is superseded by the task contract for this lane).
 */
export function ScholarlyImmuno() {
  const { text, langOf } = useCopy();
  const col1 = useReveal("scholarly-immuno-a1");
  const col2 = useReveal("scholarly-immuno-a2");
  const col3 = useReveal("scholarly-immuno-a3");

  return (
    <div className="scholarly__sub">
      <div className="scholarly__subhead">
        <p className="scholarly__num" lang={langOf("scholarly-immuno.no")}>
          {text("scholarly-immuno.no")}
        </p>
        <h3 className="scholarly__subtitle" lang={langOf("scholarly-immuno.title")}>
          {text("scholarly-immuno.title")}
        </h3>
      </div>
      <Rule variant="hairline" />

      <div className="scholarly__body scholarly__body--immuno">
        <div className="scholarly__cols">
          <div className="scholarly__col">
            <span className="scholarly__accent" aria-hidden="true" />
            <button
              type="button"
              className="scholarly__question"
              id="scholarly-immuno-q1"
              {...col1.triggerProps}
            >
              <span className="scholarly__onum" lang={langOf("scholarly-immuno.q1.no")}>
                {text("scholarly-immuno.q1.no")}
              </span>
              <span className="scholarly__qtext" lang={langOf("scholarly-immuno.q1")}>
                {text("scholarly-immuno.q1")}
              </span>
            </button>
            <div
              className="scholarly__panel scholarly__panel--qa"
              role="region"
              aria-labelledby="scholarly-immuno-q1"
              {...col1.panelProps}
            >
              <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
                {text("scholarly-hir.answerLabel")}
              </p>
              <p className="scholarly__answer scholarly__answer--qa" lang={langOf("scholarly-immuno.a1")}>
                {text("scholarly-immuno.a1")}
              </p>
            </div>
          </div>

          <div className="scholarly__col">
            <span className="scholarly__accent" aria-hidden="true" />
            <button
              type="button"
              className="scholarly__question"
              id="scholarly-immuno-q2"
              {...col2.triggerProps}
            >
              <span className="scholarly__onum" lang={langOf("scholarly-immuno.q2.no")}>
                {text("scholarly-immuno.q2.no")}
              </span>
              <span className="scholarly__qtext" lang={langOf("scholarly-immuno.q2")}>
                {text("scholarly-immuno.q2")}
              </span>
            </button>
            <div
              className="scholarly__panel scholarly__panel--qa"
              role="region"
              aria-labelledby="scholarly-immuno-q2"
              {...col2.panelProps}
            >
              <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
                {text("scholarly-hir.answerLabel")}
              </p>
              <p className="scholarly__answer scholarly__answer--qa" lang={langOf("scholarly-immuno.a2")}>
                {text("scholarly-immuno.a2")}
              </p>
            </div>
          </div>

          <div className="scholarly__col">
            <span className="scholarly__accent" aria-hidden="true" />
            <button
              type="button"
              className="scholarly__question"
              id="scholarly-immuno-q3"
              {...col3.triggerProps}
            >
              <span className="scholarly__onum" lang={langOf("scholarly-immuno.q3.no")}>
                {text("scholarly-immuno.q3.no")}
              </span>
              <span className="scholarly__qtext" lang={langOf("scholarly-immuno.q3")}>
                {text("scholarly-immuno.q3")}
              </span>
            </button>
            <div
              className="scholarly__panel scholarly__panel--qa"
              role="region"
              aria-labelledby="scholarly-immuno-q3"
              {...col3.panelProps}
            >
              <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
                {text("scholarly-hir.answerLabel")}
              </p>
              <p className="scholarly__answer scholarly__answer--qa" lang={langOf("scholarly-immuno.a3")}>
                {text("scholarly-immuno.a3")}
              </p>
            </div>
          </div>
        </div>

        <p className="scholarly__hint" lang={langOf("scholarly.revealSwipe")}>
          {text("scholarly.revealSwipe")}
        </p>
      </div>
    </div>
  );
}
