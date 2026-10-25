import { useState, type ImgHTMLAttributes } from "react";
import "./Photo.css";

/**
 * Photo: every raster photograph on the page renders through this one element, so the
 * loading affordance is one rule instead of fifteen call sites.
 *
 * The state lives on the element: `loading` while the bytes are in flight — the box already
 * has the photograph's shape, because the sections pass `width`/`height` for layout
 * stability — and `ready` once they have arrived. Photo.css paints a sheen on the first and
 * cross-fades the second over the tinted slot each section already puts behind its media
 * box, so the photograph arrives instead of appearing.
 *
 * A file served from cache is complete before React attaches `onLoad`; the commit-time check
 * in `ref` is what keeps such a photograph from flashing a sheen first. The ref holds
 * nothing past the commit.
 */
export function Photo(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [ready, setReady] = useState(false);
  return (
    <img
      {...props}
      data-photo-state={ready ? "ready" : "loading"}
      ref={(element) => {
        if (element?.complete === true && element.naturalWidth > 0) {
          setReady(true);
        }
      }}
      onLoad={() => setReady(true)}
      /* A file that will never arrive stops the sheen too: an empty slot reads as "nothing
         here", a slot sweeping forever reads as "still coming". The page ships its own
         photographs and tools/verify-render.mjs fails any that did not load, so this is the
         last resort, not the expected path. */
      onError={() => setReady(true)}
    />
  );
}
