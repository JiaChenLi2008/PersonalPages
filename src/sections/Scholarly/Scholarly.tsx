import { useCopy } from "../../i18n/copy";

/** Scholarly (01): heading only; the section layout lands in a later lane. */
export function Scholarly() {
  const { text } = useCopy();

  return (
    <section id="scholarly" data-section="scholarly" className="scholarly">
      <h2>{text("scholarly.title.zh")}</h2>
    </section>
  );
}
