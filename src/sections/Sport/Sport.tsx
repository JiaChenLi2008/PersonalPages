import { useCopy } from "../../i18n/copy";

/** Sport (04): heading only; the section layout lands in a later lane. */
export function Sport() {
  const { text } = useCopy();

  return (
    <section id="sport" data-section="sport" className="sport">
      <h2>{text("sport.title")}</h2>
    </section>
  );
}
