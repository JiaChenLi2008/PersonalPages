import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy } from "../../i18n/copy";
import "./Elder.css";

/** Elder (02): no assets yet, so the design's head, 2px baseline and pending panel only. */
export function Elder() {
  const { langOf, text } = useCopy();

  return (
    <section id="elder" data-section="elder" className="elder" aria-labelledby="elder-title">
      <h2 id="elder-title" className="elder__head">
        <span className="elder__kicker" lang={langOf("elder.kicker")}>
          {text("elder.kicker")}
        </span>
        <span className="elder__title-en" lang={langOf("elder.title.en")}>
          {text("elder.title.en")}
        </span>
      </h2>
      <Rule variant="baseline" />
      <Reveal as="div" className="elder__body">
        {/* ui.pen's Note node is an authoring annotation (docs/CHROME.md §2), never rendered. */}
        <div className="elder__panel">
          <p className="elder__pending" lang={langOf("elder.contentPending")}>
            {text("elder.contentPending")}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
