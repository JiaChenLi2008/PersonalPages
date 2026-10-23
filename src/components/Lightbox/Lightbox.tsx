import { useRef, useState } from "react";
import "./Lightbox.css";

/**
 * Lightbox: click a photograph to read the 1440-tier file in a native modal `<dialog>`.
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
 * The enlarged file is mounted only while the dialog is open: a closed dialog is
 * `display: none`, so parked 1440-tier images would either download for nothing or never
 * load, and `tools/verify-render.mjs` fails an `<img>` left at naturalWidth 0. Opening is
 * also the first moment the file is wanted — the photograph is click-to-enlarge, not
 * pre-fetched.
 */
type LightboxProps = {
  /** The enlarged file the dialog shows, e.g. `media/music-fig-1440.webp`. */
  full: string;
  /** The visible photo's alt text: the trigger's accessible name and the dialog's label. */
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
};

export function Lightbox({ full, alt, width, height, children }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);

  const open = () => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) return;
    /* The enlarged file joins the dialog on this click, then the dialog opens over the page. */
    setExpanded(true);
    dialog.showModal();
  };

  const closeOnField = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  };

  return (
    <>
      <button type="button" className="lightbox__trigger" aria-label={alt} onClick={open}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={alt}
        onClick={closeOnField}
        /* ESC and the backdrop click both land here; dropping the file leaves no stale
           `<img>` in the document between two openings. */
        onClose={() => setExpanded(false)}
      >
        {expanded ? (
          /* alt="" on purpose: the dialog already carries this text as its label, so a second
             copy would be announced twice. */
          <img
            className="lightbox__img"
            src={full}
            alt=""
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </dialog>
    </>
  );
}
