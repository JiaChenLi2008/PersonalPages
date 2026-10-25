import { useLayoutEffect, useRef, useState } from "react";
import { originalOf } from "../../lib/originals";
import "./Lightbox.css";

/**
 * Lightbox: click a photograph to see it enlarged in a native modal `<dialog>`.
 *
 * One tier where a master exists, none where it does not: `src/lib/originals.ts` pairs the
 * preview the page shows with the same frame at full size, and the dialog loads that file —
 * the sharpness the click asked for. A photograph with no master in that table enlarges the
 * file the page already shows, exactly as before (the `*-1440` derivatives are still gone;
 * this is the zip master, not a second hand-made tier).
 *
 * The enlarged file is several times the preview's bytes, so the wait is part of the design:
 * the dialog takes its final rectangle before a byte arrives (its ratio comes from the
 * enlarged file's own pixels, so `--lightbox-ratio` sizes the box up front), a ring turns in
 * the middle of that empty box, and the photograph cross-fades in under the ring when it
 * lands. Nothing jumps: the FLIP animation has a real target and the reader has somewhere to
 * look.
 *
 * The element does the work, so no focus trap is written here: `showModal()` moves focus into
 * the dialog, ESC closes it, and closing hands focus back to the element that had it (the
 * browser's "previously focused element" rule). The top layer also escapes the mask sweeps
 * the sections put on their figures — an overlay positioned inside a `.motion-clip` slot
 * would be clipped to that slot's zero-area rectangle.
 *
 * There is no close button because both dictionaries are frozen for this lane and carry no
 * "close" label; inventing one is not this lane's to do. A pointer user closes on the dark
 * field — the dialog's own box and its ::backdrop both report the dialog as `event.target`,
 * so one identity check covers both fields and a click on the photo never closes it.
 *
 * Open and close are FLIP animations (no View Transition API, which Safari/Firefox do not
 * ship): the enlarged box starts on the trigger photograph's own rectangle — read with
 * `getBoundingClientRect()`, applied as `translate + scale` from `transform-origin: top left`
 * — and travels to where the modal puts it, while the backdrop fades in through the
 * `data-animating` attribute. The animated box is the dialog, not the figure: a transformed
 * descendant still counts toward the dialog's scrollable overflow (`scrollHeight`), so
 * animating the figure would leave a nonzero `scrollHeight - clientHeight` even under
 * `overflow: visible`. The figure fills the dialog exactly (zero padding, border and margin),
 * so animating the dialog is the same rectangle. Closing is the same trip backwards, and
 * `dialog.close()` runs only when it lands. `prefers-reduced-motion: reduce` skips both legs.
 * The attribute doubles as the guard: while a leg runs, a stray click on the dark field and a
 * second ESC are ignored, so a fast double click cannot leave a half-animated dialog behind.
 *
 * The enlarged image is mounted only while the dialog is open: a closed dialog is
 * `display: none`, so a parked `<img>` there would never load and `tools/verify-render.mjs`
 * fails an `<img>` left at naturalWidth 0.
 */
type LightboxProps = {
  /** The preview the trigger shows, e.g. `media/music-fig-720.webp`. It is also the key the
      enlarged file is looked up by (`src/lib/originals.ts`); with no entry, the dialog shows
      this same file. */
  src: string;
  /** The photograph's alt text: the trigger's accessible name and the dialog's label. */
  alt: string;
  width: number;
  height: number;
  /**
   * The visible photograph itself: the section keeps owning its box, ratio and object-fit.
   * `aria-hidden` stays on the section's own media box inside this button — it hides only the
   * decorative box, never the control, and the accessible name comes from the trigger's
   * `aria-label` (which is what `tools/verify-render.mjs`'s placeholder criterion expects).
   */
  children: React.ReactNode;
  /**
   * True for a loop clone: the button keeps its mouse click (the visible photo must enlarge)
   * but leaves the accessibility tree and the tab order, because the real track already
   * carries this photo's one control.
   */
  decorativeTrigger?: boolean;
};

/** 220–280ms out, 180–240ms in (the lane's contract): short enough to feel like the click. */
const OPEN_MS = 250;
const CLOSE_MS = 200;

/** Read per click: the reader may flip the OS switch between two openings. */
const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The starting transform of the open leg — and, with the endpoints swapped, of the close
 * leg: the scaled box lands exactly on `rect` because the origin is the box's top-left
 * corner. `null` when the box has no area yet (a hidden dialog cannot be measured), which
 * leaves the plain open/close with no animation rather than a jump from nowhere.
 */
function flipFrom(box: DOMRect, rect: DOMRect): string | null {
  if (box.width === 0 || box.height === 0) return null;
  const x = rect.left - box.left;
  const y = rect.top - box.top;
  return `translate(${x}px, ${y}px) scale(${rect.width / box.width}, ${rect.height / box.height})`;
}

export function Lightbox({ src, alt, width, height, children, decorativeTrigger = false }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const enlargedRef = useRef<HTMLImageElement>(null);
  /** The trigger photograph's rectangle at click time, for the open leg. */
  const originRef = useRef<DOMRect | null>(null);
  const closingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  /** False until the enlarged file has painted, or failed to. Reset on every opening. */
  const [loaded, setLoaded] = useState(false);
  /* The enlarged file, or the preview when the table has no row for it. Resolved per render
     so a lightbox is never a stale copy of the table. */
  const enlarged = originalOf(src) ?? { src, width, height };

  /** The photograph the reader clicked: the trigger's own `<img>`, not the button's box. */
  const triggerRect = () =>
    (triggerRef.current?.querySelector("img") ?? triggerRef.current)?.getBoundingClientRect() ?? null;

  const open = () => {
    if (expanded || dialogRef.current === null) return;
    originRef.current = triggerRect();
    setLoaded(false);
    setExpanded(true);
  };

  /* The image has to be in the DOM before it can be measured, so the dialog opens here
     rather than in the click handler — one commit, no frame of the un-animated modal. */
  useLayoutEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (!dialog.open) dialog.showModal();
    /* A file the browser already holds (a second opening, or a 2 KB wall photo) is complete
       on mount and fires no `load`; the ring must not outlive it. */
    const image = enlargedRef.current;
    if (image?.complete === true && image.naturalWidth > 0) setLoaded(true);
    const origin = originRef.current;
    originRef.current = null;
    if (reduceMotion() || origin === null) return;
    const from = flipFrom(dialog.getBoundingClientRect(), origin);
    if (from === null) return;
    dialog.dataset.animating = "open";
    const animation = dialog.animate([{ transform: from }, { transform: "none" }], {
      duration: OPEN_MS,
      easing: "ease-out",
    });
    const settle = () => delete dialog.dataset.animating;
    animation.onfinish = settle;
    animation.oncancel = settle;
  }, [expanded]);

  const close = () => {
    const dialog = dialogRef.current;
    if (dialog === null || !dialog.open || closingRef.current) return;
    closingRef.current = true;
    const finish = () => {
      closingRef.current = false;
      delete dialog.dataset.animating;
      dialog.close();
    };
    const origin = triggerRect();
    const to = origin !== null ? flipFrom(dialog.getBoundingClientRect(), origin) : null;
    if (reduceMotion() || to === null) {
      finish();
      return;
    }
    dialog.dataset.animating = "close";
    const animation = dialog.animate([{ transform: "none" }, { transform: to }], {
      duration: CLOSE_MS,
      easing: "ease-in",
    });
    animation.onfinish = finish;
    animation.oncancel = finish;
  };

  const closeOnField = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    /* A click that lands mid-animation is the misclick the guard exists for. */
    if (event.currentTarget.dataset.animating !== undefined) return;
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="lightbox__trigger"
        aria-label={alt}
        aria-hidden={decorativeTrigger ? "true" : undefined}
        tabIndex={decorativeTrigger ? -1 : undefined}
        onClick={open}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={alt}
        onClick={closeOnField}
        /* ESC is answered here instead of by the browser so the close leg can run: `cancel`
           is cancelled, the animation plays, and `close()` follows it. */
        onCancel={(event) => {
          event.preventDefault();
          if (event.currentTarget.dataset.animating === "open") return;
          close();
        }}
        /* Whichever way it closed, the enlarged image leaves the document: no stale `<img>`
           between two openings, and nothing left for the animation to hold on to. */
        onClose={() => {
          delete dialogRef.current?.dataset.animating;
          setExpanded(false);
        }}
      >
        {expanded ? (
          <figure
            className="lightbox__figure"
            data-image={loaded ? "ready" : "loading"}
            /* The box's own ratio, from the enlarged file's pixels: the dialog is the
               photograph's size before the photograph is here, so the FLIP has a target and
               the ring has a middle. */
            style={{ "--lightbox-ratio": enlarged.width / enlarged.height } as React.CSSProperties}
          >
            {/* alt="" on purpose: the dialog already carries this text as its label, so a
                second copy would be announced twice. */}
            <img
              ref={enlargedRef}
              className="lightbox__img"
              src={enlarged.src}
              alt=""
              width={enlarged.width}
              height={enlarged.height}
              decoding="async"
              onLoad={() => setLoaded(true)}
              /* A file that will never arrive must not leave a ring turning on a dark field
                 for as long as the dialog is open. */
              onError={() => setLoaded(true)}
            />
            <span className="lightbox__loader" aria-hidden="true" />
          </figure>
        ) : null}
      </dialog>
    </>
  );
}
