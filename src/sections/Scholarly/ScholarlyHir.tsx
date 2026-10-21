import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import { useRevealPanel } from "../../lib/useRevealPanel";

/**
 * 01.4 HIR writing contest (ui.pen `FMu2N`): figure slot, three long questions
 * with their answer panels, three lead paragraphs, then the essay card.
 *
 * The board draws each question's closing sentence as a pull-quote between two
 * questions; docx page 4 moves all three into their own answer panel, one blank line
 * below the body and in a second colour, so they are only read once the panel opens.
 * The leads sit where the last pull-quote was, between that panel and the card.
 *
 * The board stacks a blue mono number (`Onum`) above each question (`Qtext`) inside a
 * 10px-gap frame, so each question renders as two nodes: `scholarly-hir.q<n>.no` and
 * `scholarly-hir.q<n>` (the same split the Immunotherapy block uses).
 *
 * The three answers are one reveal group of the shared skeleton (motion spec §3.5);
 * the body wrapper is that group, so it holds every question, panel and lead.
 *
 * The shared motion hooks of §4 land here too: `.motion-clip` on the figure slot
 * (device ②), `.motion-slide` on the question ordinal (device ③) and
 * `.motion-hover` on the question button (device ④); `Reveal` adds the `.is-in`
 * both clip and slide wait for.
 */
export function ScholarlyHir() {
  const { text, langOf } = useCopy();
  const q1 = useRevealPanel({
    panelId: "scholarly-hir-a1",
    triggerId: "scholarly-hir-q1",
    group: "scholarly-hir",
  });
  const q2 = useRevealPanel({
    panelId: "scholarly-hir-a2",
    triggerId: "scholarly-hir-q2",
    group: "scholarly-hir",
  });
  const q3 = useRevealPanel({
    panelId: "scholarly-hir-a3",
    triggerId: "scholarly-hir-q3",
    group: "scholarly-hir",
  });

  return (
    <div className="scholarly__sub">
      <div className="scholarly__subhead">
        <p className="scholarly__num" lang={langOf("scholarly-hir.no")}>
          {text("scholarly-hir.no")}
        </p>
        <h3 className="scholarly__subtitle" lang={langOf("scholarly-hir.title")}>
          {text("scholarly-hir.title")}
        </h3>
      </div>
      <Rule variant="hairline" />

      <div className="scholarly__body scholarly__body--hir motion-reveal-group">
        <div className="scholarly__media scholarly__media--hir">
          <Reveal className="scholarly__clip motion-clip">
            <img
              className="scholarly__photo"
              src="./media/hir-fig-2688.webp"
              alt={text("scholarly-hir.fig.alt")}
              width={2688}
              height={840}
              loading="lazy"
              decoding="async"
            />
          </Reveal>
        </div>

        <p className="scholarly__hint" lang={langOf("scholarly.revealTap")}>
          {text("scholarly.revealTap")}
        </p>

        <button type="button" className="scholarly__question scholarly__question--hir motion-hover" {...q1.triggerProps}>
          <Reveal as="span" className="motion-slide">
            <span className="scholarly__onum" lang={langOf("scholarly-hir.q1.no")}>
              {text("scholarly-hir.q1.no")}
            </span>
          </Reveal>
          <span className="scholarly__qtext scholarly__qtext--hir" lang={langOf("scholarly-hir.q1")}>
            {text("scholarly-hir.q1")}
          </span>
        </button>
        <div {...q1.panelProps}>
          <div className="motion-reveal-clip">
            <div className="scholarly__panel scholarly__panel--hir">
              <p
                className="scholarly__panelLabel motion-answer"
                data-stagger="1"
                lang={langOf("scholarly-hir.answerLabel")}
              >
                {text("scholarly-hir.answerLabel")}
              </p>
              <p
                className="scholarly__answer scholarly__answer--hir motion-answer"
                data-stagger="2"
                lang={langOf("scholarly-hir.a1")}
              >
                {text("scholarly-hir.a1")}
              </p>
              <p
                className="scholarly__answer scholarly__answer--hir scholarly__answer--merge"
                lang={langOf("scholarly-hir.bridge1")}
              >
                {text("scholarly-hir.bridge1")}
              </p>
            </div>
          </div>
        </div>

        <button type="button" className="scholarly__question scholarly__question--hir motion-hover" {...q2.triggerProps}>
          <Reveal as="span" className="motion-slide">
            <span className="scholarly__onum" lang={langOf("scholarly-hir.q2.no")}>
              {text("scholarly-hir.q2.no")}
            </span>
          </Reveal>
          <span className="scholarly__qtext scholarly__qtext--hir" lang={langOf("scholarly-hir.q2")}>
            {text("scholarly-hir.q2")}
          </span>
        </button>
        <div {...q2.panelProps}>
          <div className="motion-reveal-clip">
            <div className="scholarly__panel scholarly__panel--hir">
              <p
                className="scholarly__panelLabel motion-answer"
                data-stagger="1"
                lang={langOf("scholarly-hir.answerLabel")}
              >
                {text("scholarly-hir.answerLabel")}
              </p>
              <p
                className="scholarly__answer scholarly__answer--hir motion-answer"
                data-stagger="2"
                lang={langOf("scholarly-hir.a2")}
              >
                {text("scholarly-hir.a2")}
              </p>
              <p
                className="scholarly__answer scholarly__answer--hir scholarly__answer--merge"
                lang={langOf("scholarly-hir.bridge2")}
              >
                {text("scholarly-hir.bridge2")}
              </p>
            </div>
          </div>
        </div>

        <button type="button" className="scholarly__question scholarly__question--hir motion-hover" {...q3.triggerProps}>
          <Reveal as="span" className="motion-slide">
            <span className="scholarly__onum" lang={langOf("scholarly-hir.q3.no")}>
              {text("scholarly-hir.q3.no")}
            </span>
          </Reveal>
          <span className="scholarly__qtext scholarly__qtext--hir" lang={langOf("scholarly-hir.q3")}>
            {text("scholarly-hir.q3")}
          </span>
        </button>
        <div {...q3.panelProps}>
          <div className="motion-reveal-clip">
            <div className="scholarly__panel scholarly__panel--hir">
              <p
                className="scholarly__panelLabel motion-answer"
                data-stagger="1"
                lang={langOf("scholarly-hir.answerLabel")}
              >
                {text("scholarly-hir.answerLabel")}
              </p>
              <p
                className="scholarly__answer scholarly__answer--hir motion-answer"
                data-stagger="2"
                lang={langOf("scholarly-hir.a3")}
              >
                {text("scholarly-hir.a3")}
              </p>
              <p
                className="scholarly__answer scholarly__answer--hir scholarly__answer--merge"
                lang={langOf("scholarly-hir.closing")}
              >
                {text("scholarly-hir.closing")}
              </p>
            </div>
          </div>
        </div>

        <p className="scholarly__lead" lang={langOf("scholarly-hir.lead1")}>
          {text("scholarly-hir.lead1")}
        </p>
        <p className="scholarly__lead" lang={langOf("scholarly-hir.lead2")}>
          {text("scholarly-hir.lead2")}
        </p>
        <p className="scholarly__lead" lang={langOf("scholarly-hir.lead3")}>
          {text("scholarly-hir.lead3")}
        </p>

        <div className="scholarly__docCard">
          <div className="scholarly__docL">
            <p className="scholarly__docTitle" lang={langOf("scholarly-hir.card.title")}>
              {text("scholarly-hir.card.title")}
            </p>
            <p className="scholarly__meta" lang={langOf("scholarly.meta")}>
              {text("scholarly.meta")}
            </p>
          </div>
          <a
            className="scholarly__link"
            href="./media/hir-essay.pdf"
            lang={langOf("scholarly.linkPdf")}
            target="_blank"
            rel="noopener noreferrer"
          >
            {text("scholarly.linkPdf")}
          </a>
        </div>
      </div>
    </div>
  );
}
