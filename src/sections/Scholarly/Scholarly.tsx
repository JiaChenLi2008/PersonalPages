import { Rule } from "../../components/primitives/Rule";
import { useCopy } from "../../i18n/copy";
import { useLang } from "../../i18n/lang";
import { ScholarlyHir } from "./ScholarlyHir";
import { ScholarlyIgem } from "./ScholarlyIgem";
import { ScholarlyImmuno } from "./ScholarlyImmuno";
import { ScholarlyJhu } from "./ScholarlyJhu";
import "./scholarly.css";

/**
 * Scholarly (01, `SCHOLARLY PURSUITS`) — the ui.pen frame `ppRfL`: section head plus the four
 * frozen sub-blocks in the frozen order iGEM → JHU → Immunotherapy → HIR.
 * The page's single h1 belongs to Hero (BLUEPRINT §6.1); this section starts at h2.
 *
 * The head's title key is a pair (`scholarly.title.zh` / `.en`): only the page's own
 * side reaches the DOM, so the two keys never stand next to each other in one page.
 */
export function Scholarly() {
  const { text, langOf } = useCopy();
  const { lang } = useLang();
  const zh = lang === "zh-Hans";

  return (
    <section
      id="scholarly"
      className="scholarly"
      data-section="scholarly"
      aria-labelledby="scholarly-title"
    >
      <div className="scholarly__head">
        <p className="scholarly__kicker" lang={langOf("scholarly.kicker")}>
          {text("scholarly.kicker")}
        </p>
        <h2
          className="scholarly__title"
          id="scholarly-title"
          lang={zh ? langOf("scholarly.title.zh") : langOf("scholarly.title.en")}
        >
          {zh ? text("scholarly.title.zh") : text("scholarly.title.en")}
        </h2>
      </div>
      <Rule variant="baseline" />

      <ScholarlyIgem />
      <ScholarlyJhu />
      <ScholarlyImmuno />
      <ScholarlyHir />
    </section>
  );
}
