import { Rule } from "../../components/primitives/Rule";
import { useCopy } from "../../i18n/copy";
import { useReveal } from "./useReveal";

/**
 * 01.4 HIR writing contest (ui.pen `FMu2N`): figure slot, three long questions
 * with their answer panels and closing pull-quotes, then the essay card.
 *
 * The board stacks a blue mono number above each question, but `scholarly-hir.q1..q3`
 * carry the number as part of the question text (docs/CHROME.md, alignment note 3),
 * so the number renders inline with the question and no second node repeats it.
 */
export function ScholarlyHir() {
  const { text, langOf } = useCopy();
  const q1 = useReveal("scholarly-hir-a1");
  const q2 = useReveal("scholarly-hir-a2");
  const q3 = useReveal("scholarly-hir-a3");

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

      <div className="scholarly__body scholarly__body--hir">
        <div className="scholarly__media scholarly__media--hir" aria-hidden="true">
          <span className="scholarly__pending" lang={langOf("scholarly.imagePending")}>
            {text("scholarly.imagePending")}
          </span>
        </div>

        <p className="scholarly__hint" lang={langOf("scholarly.revealTap")}>
          {text("scholarly.revealTap")}
        </p>

        <button type="button" className="scholarly__question" id="scholarly-hir-q1" {...q1.triggerProps}>
          <span className="scholarly__qtext scholarly__qtext--hir" lang={langOf("scholarly-hir.q1")}>
            {text("scholarly-hir.q1")}
          </span>
        </button>
        <div
          className="scholarly__panel scholarly__panel--hir"
          role="region"
          aria-labelledby="scholarly-hir-q1"
          {...q1.panelProps}
        >
          <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
            {text("scholarly-hir.answerLabel")}
          </p>
          <p className="scholarly__answer scholarly__answer--hir" lang={langOf("scholarly-hir.a1")}>
            {text("scholarly-hir.a1")}
          </p>
        </div>
        <div className="scholarly__pull">
          <span className="scholarly__accent" aria-hidden="true" />
          <p className="scholarly__pullText" lang={langOf("scholarly-hir.bridge1")}>
            {text("scholarly-hir.bridge1")}
          </p>
        </div>

        <button type="button" className="scholarly__question" id="scholarly-hir-q2" {...q2.triggerProps}>
          <span className="scholarly__qtext scholarly__qtext--hir" lang={langOf("scholarly-hir.q2")}>
            {text("scholarly-hir.q2")}
          </span>
        </button>
        <div
          className="scholarly__panel scholarly__panel--hir"
          role="region"
          aria-labelledby="scholarly-hir-q2"
          {...q2.panelProps}
        >
          <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
            {text("scholarly-hir.answerLabel")}
          </p>
          <p className="scholarly__answer scholarly__answer--hir" lang={langOf("scholarly-hir.a2")}>
            {text("scholarly-hir.a2")}
          </p>
        </div>
        <div className="scholarly__pull">
          <span className="scholarly__accent" aria-hidden="true" />
          <p className="scholarly__pullText" lang={langOf("scholarly-hir.bridge2")}>
            {text("scholarly-hir.bridge2")}
          </p>
        </div>

        <button type="button" className="scholarly__question" id="scholarly-hir-q3" {...q3.triggerProps}>
          <span className="scholarly__qtext scholarly__qtext--hir" lang={langOf("scholarly-hir.q3")}>
            {text("scholarly-hir.q3")}
          </span>
        </button>
        <div
          className="scholarly__panel scholarly__panel--hir"
          role="region"
          aria-labelledby="scholarly-hir-q3"
          {...q3.panelProps}
        >
          <p className="scholarly__panelLabel" lang={langOf("scholarly-hir.answerLabel")}>
            {text("scholarly-hir.answerLabel")}
          </p>
          <p className="scholarly__answer scholarly__answer--hir" lang={langOf("scholarly-hir.a3")}>
            {text("scholarly-hir.a3")}
          </p>
        </div>
        <div className="scholarly__pull">
          <span className="scholarly__accent" aria-hidden="true" />
          <p className="scholarly__pullText" lang={langOf("scholarly-hir.closing")}>
            {text("scholarly-hir.closing")}
          </p>
        </div>

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
