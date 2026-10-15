import { useCopy } from "../../i18n/copy";

/** Elder (02): heading only; the section layout lands in a later lane. */
export function Elder() {
  const { text } = useCopy();

  return (
    <section id="elder" data-section="elder" className="elder">
      <h2>{text("elder.title.zh")}</h2>
    </section>
  );
}
