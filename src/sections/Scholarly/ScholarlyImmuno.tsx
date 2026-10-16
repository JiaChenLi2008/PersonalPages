import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import { useRevealPanel } from "../../lib/useRevealPanel";

/**
 * 01.3 Immunotherapy Studies (ui.pen `H1VYtj`): three equal columns, each a 40×3
 * accent rule, its numbered question button, and the answer panel behind it.
 * Click and keyboard are the whole interaction — the board's `SWIPE → REVEAL`
 * hint stays a label, so no gesture exists that could be the only path (BLUEPRINT
 * §4#4's scroll-snap carousel is superseded by the task contract for this lane).
 *
 * The three columns share the reveal skeleton with JHU and HIR and form their own
 * group (motion spec §3.5): the collapsed column keeps its answer in the DOM, so no
 * `aria-hidden` is used — the trigger's `aria-expanded` and the panel's collapsed
 * `visibility` carry the semantics, and `data-state` carries the styles.
 *
 * The shared motion hooks of §4 land here too: `.motion-slide` on the column
 * ordinal (device ③) and `.motion-hover` on the question button (device ④);
 * `Reveal` is what adds the `.is-in` the slide waits for.
 */
export function ScholarlyImmuno() {
  const { text, langOf } = useCopy();
  const col1 = useRevealPanel({
    panelId: "scholarly-immuno-a1",
    triggerId: "scholarly-immuno-q1",
    group: "scholarly-immuno",
  });
  const col2 = useRevealPanel({
    panelId: "scholarly-immuno-a2",
    triggerId: "scholarly-immuno-q2",
    group: "scholarly-immuno",
  });
  const col3 = useRevealPanel({
    panelId: "scholarly-immuno-a3",
    triggerId: "scholarly-immuno-q3",
    group: "scholarly-immuno",
  });

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
        <div className="scholarly__cols motion-reveal-group">
          <div className="scholarly__col">
            <span className="scholarly__accent" aria-hidden="true" />
            <button type="button" className="scholarly__question motion-hover" {...col1.triggerProps}>
              <Reveal as="span" className="motion-slide">
                <span className="scholarly__onum" lang={langOf("scholarly-immuno.q1.no")}>
                  {text("scholarly-immuno.q1.no")}
                </span>
              </Reveal>
              <span className="scholarly__qtext" lang={langOf("scholarly-immuno.q1")}>
                {text("scholarly-immuno.q1")}
              </span>
            </button>
            <div {...col1.panelProps}>
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
                    lang={langOf("scholarly-immuno.a1")}
                  >
                    {text("scholarly-immuno.a1")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="scholarly__col">
            <span className="scholarly__accent" aria-hidden="true" />
            <button type="button" className="scholarly__question motion-hover" {...col2.triggerProps}>
              <Reveal as="span" className="motion-slide">
                <span className="scholarly__onum" lang={langOf("scholarly-immuno.q2.no")}>
                  {text("scholarly-immuno.q2.no")}
                </span>
              </Reveal>
              <span className="scholarly__qtext" lang={langOf("scholarly-immuno.q2")}>
                {text("scholarly-immuno.q2")}
              </span>
            </button>
            <div {...col2.panelProps}>
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
                    lang={langOf("scholarly-immuno.a2")}
                  >
                    {text("scholarly-immuno.a2")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="scholarly__col">
            <span className="scholarly__accent" aria-hidden="true" />
            <button type="button" className="scholarly__question motion-hover" {...col3.triggerProps}>
              <Reveal as="span" className="motion-slide">
                <span className="scholarly__onum" lang={langOf("scholarly-immuno.q3.no")}>
                  {text("scholarly-immuno.q3.no")}
                </span>
              </Reveal>
              <span className="scholarly__qtext" lang={langOf("scholarly-immuno.q3")}>
                {text("scholarly-immuno.q3")}
              </span>
            </button>
            <div {...col3.panelProps}>
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
                    lang={langOf("scholarly-immuno.a3")}
                  >
                    {text("scholarly-immuno.a3")}
                  </p>
                </div>
              </div>
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
