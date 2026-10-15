import { useCopy } from "../../i18n/copy";

/** Music (03): heading only; the section layout lands in a later lane. */
export function Music() {
  const { text } = useCopy();

  return (
    <section id="music" data-section="music" className="music">
      <h2>{text("music.title")}</h2>
    </section>
  );
}
