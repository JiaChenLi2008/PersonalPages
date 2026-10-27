import { Photo } from "../../components/Photo/Photo";
import { Reveal } from "../../components/primitives/Reveal";
import "./PhotoBand.css";

/**
 * PhotoBand: the full-bleed 18:7 media slot (ui.pen V3Yy1). The slot carries the design's
 * own photo — public/media/photoband-2880.webp, cut to the node's 2880×1120 source — so it
 * is a decorative image (`alt=""`, BLUEPRINT §5) and the band carries no words.
 */
export function PhotoBand() {
  return (
    <section id="photoband" data-section="photo-band" className="photo-band">
      <Reveal once as="figure" className="photo-band__figure">
        {/* Two devices, two elements: the slot sweeps open (.motion-clip) while the photo
            inside it travels with the scroll (.motion-parallax) — no property is shared. */}
        <Reveal once as="div" className="photo-band__media motion-clip">
          <Photo
            className="photo-band__img motion-parallax"
            src="./media/photoband-2880.webp"
            alt=""
            width={2880}
            height={1120}
            loading="lazy"
            decoding="async"
          />
        </Reveal>
      </Reveal>
    </section>
  );
}
