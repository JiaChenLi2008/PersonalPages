import { Rule } from "../../components/primitives/Rule";
import { Reveal } from "../../components/primitives/Reveal";
import { useCopy, type CopyKey } from "../../i18n/copy";
import { useLang } from "../../i18n/lang";

/**
 * The four pillars docx-1021 items 3 and 4 put under the iGEM subsections: one key for the
 * block's title and three for its bullet points, four blocks in the 2×2 matrix. Every key is
 * spelled out: tools/verify-copy-wiring.mjs only sees a dictionary key it can read as a
 * string literal.
 */
const PILLARS = [
  {
    title: "scholarly-igem.pillar1.title",
    items: [
      "scholarly-igem.pillar1.item1",
      "scholarly-igem.pillar1.item2",
      "scholarly-igem.pillar1.item3",
    ],
  },
  {
    title: "scholarly-igem.pillar2.title",
    items: [
      "scholarly-igem.pillar2.item1",
      "scholarly-igem.pillar2.item2",
      "scholarly-igem.pillar2.item3",
    ],
  },
  {
    title: "scholarly-igem.pillar3.title",
    items: [
      "scholarly-igem.pillar3.item1",
      "scholarly-igem.pillar3.item2",
      "scholarly-igem.pillar3.item3",
    ],
  },
  {
    title: "scholarly-igem.pillar4.title",
    items: [
      "scholarly-igem.pillar4.item1",
      "scholarly-igem.pillar4.item2",
      "scholarly-igem.pillar4.item3",
    ],
  },
] as const satisfies readonly { title: CopyKey; items: readonly CopyKey[] }[];

/**
 * 01.1 iGEM (ui.pen `gE6yx`): Lab contribution and Paris Conference with the
 * project CTA in the left column, two 4:3 figure slots in the 360px right column.
 * The docx's two later additions sit inside this left column, in reading order: the
 * result copy (item 2) between the lab paragraph and the Paris heading, and the 2x2
 * pillar matrix (item 3) in the seam between that result block and the Paris heading
 * (docx-1023 item 1, the user's ruling: the cards move up to the seam rather than
 * trailing the whole body). The column is 937px at the 1440 board, so each card keeps
 * a ~450px cell and the 2x2 matrix stays a matrix.
 * `lang` always comes from the dictionary entry's own `lang` field (BLUEPRINT §6.4).
 * The board draws the CTA as one node holding both languages back to back; only the
 * page's own side reaches the DOM, so a page never carries the other one.
 *
 * Both figure slots carry the §4 device ② mask sweep (`.motion-clip`), which `Reveal`
 * starts once the slot scrolls in.
 */
export function ScholarlyIgem() {
  const { text, langOf } = useCopy();
  const { lang } = useLang();
  const zh = lang === "zh-Hans";

  return (
    <div className="scholarly__sub">
      <div className="scholarly__subhead">
        <p className="scholarly__num" lang={langOf("scholarly-igem.no")}>
          {text("scholarly-igem.no")}
        </p>
        <h3 className="scholarly__subtitle" lang={langOf("scholarly-igem.title")}>
          {text("scholarly-igem.title")}
        </h3>
      </div>
      <Rule variant="hairline" />

      <div className="scholarly__body scholarly__body--igem">
        <div className="scholarly__igemCol">
          <h4 className="scholarly__k" lang={langOf("scholarly-igem.sub1")}>
            {text("scholarly-igem.sub1")}
          </h4>
          <p className="scholarly__d" lang={langOf("scholarly-igem.para1")}>
            {text("scholarly-igem.para1")}
          </p>
          {/* docx-1021 item 2: the result block sits between lab and Paris. The title
              reuses the section's key-phrase class and the body the body class, so the block
              adds hierarchy through a hairline, not through a fifth text size. */}
          <div className="scholarly__result">
            <p className="scholarly__k" lang={langOf("scholarly-igem.result.title")}>
              {text("scholarly-igem.result.title")}
            </p>
            <p className="scholarly__d" lang={langOf("scholarly-igem.result.body")}>
              {text("scholarly-igem.result.body")}
            </p>
          </div>
          {/* docx-1023 item 1 (user ruling): the 2x2 white cards move up into the seam
              between the result block and the Paris Conference heading.
              Each block is a card (`.scholarly__pillarCard`) that lifts and scales on hover;
              the outer `Reveal` gives the four cards the same staggered entrance every other
              block gets. The two live on separate elements on purpose: `.reveal` owns
              `transition: opacity, transform` and a card that also owned the hover transition
              would drop one of the two. */}
          <div className="scholarly__pillars">
            {PILLARS.map((pillar, index) => (
              <Reveal
                key={pillar.title}
                as="div"
                className="scholarly__pillar"
                delay={(index % 2 === 0 ? 0 : 1) as 0 | 1}
              >
                <div className="scholarly__pillarCard">
                  <p className="scholarly__pillarTitle" lang={langOf(pillar.title)}>
                    {text(pillar.title)}
                  </p>
                  <ul className="scholarly__pillarItems">
                    {pillar.items.map((item) => (
                      <li key={item} lang={langOf(item)}>
                        {text(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <h4 className="scholarly__k" lang={langOf("scholarly-igem.sub2")}>
            {text("scholarly-igem.sub2")}
          </h4>
          <p className="scholarly__d" lang={langOf("scholarly-igem.para2")}>
            {text("scholarly-igem.para2")}
          </p>
          {/* docx-1021 item 4 and the user's ruling: the CTA asks the reader to open the
              project site and must read as a call, not as a footnote — but the anchor shows
              the sentence, never the raw URL. The whole sentence is the anchor on purpose:
              the copy says "Click here", so a separate link line below it would leave the
              phrase "Click here" looking clickable while doing nothing. One element, one
              action, no false affordance. */}
          <p className="scholarly__cta scholarly__cta--lead">
            <a
              className="scholarly__url scholarly__url--lead"
              href={text("scholarly-igem.cta.url")}
              lang={zh ? langOf("scholarly-igem.cta.zh") : langOf("scholarly-igem.cta.en")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {zh ? text("scholarly-igem.cta.zh") : text("scholarly-igem.cta.en")}
            </a>
          </p>
        </div>

        <div className="scholarly__figcol">
          <figure className="scholarly__fig">
            <div className="scholarly__media scholarly__media--4x3">
              <Reveal className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/igem-fig1-720.webp"
                  alt={text("scholarly-igem.fig1.alt")}
                  width={720}
                  height={540}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </div>
            <figcaption className="scholarly__cap" lang={langOf("scholarly.figcap2")}>
              {text("scholarly.figcap2")}
            </figcaption>
          </figure>

          <figure className="scholarly__fig">
            <div className="scholarly__media scholarly__media--4x3">
              <Reveal className="scholarly__clip motion-clip">
                <img
                  className="scholarly__photo"
                  src="./media/igem-fig2-720.webp"
                  alt={text("scholarly-igem.fig2.alt")}
                  width={720}
                  height={540}
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
            </div>
            <figcaption className="scholarly__cap" lang={langOf("scholarly.figcap3")}>
              {text("scholarly.figcap3")}
            </figcaption>
          </figure>
        </div>
      </div>

    </div>
  );
}
