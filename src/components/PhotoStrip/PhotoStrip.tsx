import { useEffect, useRef, useState } from "react";
import { Lightbox } from "../Lightbox/Lightbox";
import { useCopy } from "../../i18n/copy";
import "./PhotoStrip.css";

/**
 * PhotoStrip: the drifting wall of photographs the docx adds to two sections —
 * Music (页面6, "依次滚动播放" over nine photos) and Sport (页面7, "先放照片滚动墙",
 * four photos). Both walls are this one component; the task forbids a second copy, and
 * the geometry, the seamless loop and the reduced-motion fallback are identical.
 *
 * Every photo in the real track is a lightbox trigger (docx-1023 item 5: "照片可点开放大"),
 * so a wall photo enlarges that same file exactly the way the section figures do. The
 * photographs stay decorative (`alt=""`); the control carries the name, and the one chrome
 * key `photo.zoom` is that name for all thirteen of them.
 *
 * The reel holds still while a reader is looking at one photo and runs again when they leave
 * it: `pointerenter` / `pointerleave` for the mouse and a keyboard focus inside the wall (see
 * `paused` below), one attribute and one `animation-play-state` switch on the animation that
 * already exists.
 *
 * `data-strip` names each wall in the DOM; tools/verify-music-sport-dom.mjs holds
 * Music to nine photos and Sport to four, and counts the loop's second copy separately
 * so a missing photo cannot hide behind the clone.
 *
 * The reel repeats the track as many times as the viewport needs. A single copy is only
 * ~1200px on Sport's four photos while the strip is 1329px wide at 1440, so one clone
 * left a bare gap at the right edge and the junction read as a seam; the copy count is
 * therefore derived from the measured track width and the strip width, never fixed.
 */
export type StripPhoto = {
  /** Path as the section figure writes it, e.g. `media/music-wall-1.webp`. */
  src: string;
  /** Intrinsic pixel size from public/media/MANIFEST.json (keeps the strip from shifting). */
  width: number;
  height: number;
};

export function PhotoStrip({ name, photos }: { name: string; photos: readonly StripPhoto[] }) {
  const { text } = useCopy();
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /* One track is the real copy; `copies - 1` clones follow it. Two is the floor: the
     animation needs a second copy to travel into even when one track already overflows. */
  const [copies, setCopies] = useState(2);
  const [trackWidth, setTrackWidth] = useState(0);
  /* The two reasons the reel stops, and the one attribute they both write: the pointer rests
     on the wall, or the keyboard is inside it. A touch contact is not a third reason — a tap
     leaves `:hover` applied on mobile browsers, and a wall frozen by a tap nobody meant as a
     pause has no way back. Releasing one reason only resumes the loop once the other is gone,
     so moving the mouse off a wall the reader is tabbing through does not start it again. */
  const [paused, setPaused] = useState(false);
  const pointerHeld = useRef(false);
  const keyboardHeld = useRef(false);
  const syncPaused = () => setPaused(pointerHeld.current || keyboardHeld.current);

  const holdForPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    pointerHeld.current = true;
    syncPaused();
  };

  const releaseForPointer = () => {
    pointerHeld.current = false;
    syncPaused();
  };

  /* `:focus-visible`, not `:focus`: a click focuses the trigger too, and only the keyboard
     reader asked the wall to wait. */
  const holdForKeyboard = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.target.matches(":focus-visible")) return;
    keyboardHeld.current = true;
    syncPaused();
  };

  const releaseForKeyboard = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    keyboardHeld.current = false;
    syncPaused();
  };

  useEffect(() => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (strip === null || track === null) return;

    const measure = () => {
      const trackWidth = track.getBoundingClientRect().width;
      const stripWidth = strip.getBoundingClientRect().width;
      if (trackWidth <= 0) return;
      /* Enough copies that the reel always covers the strip plus one full track: the
         reel must never run out of photos before the loop wraps. */
      const needed = Math.ceil((stripWidth + trackWidth) / trackWidth) + 1;
      setCopies(Math.max(2, needed));
      setTrackWidth(trackWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    observer.observe(track);
    return () => observer.disconnect();
  }, [photos]);

  const photo = (entry: StripPhoto) => (
    <img
      className="photo-strip__img"
      src={entry.src}
      alt=""
      width={entry.width}
      height={entry.height}
      loading="lazy"
      decoding="async"
    />
  );

  const track = (clone: boolean, index: number) => (
    <div
      key={index}
      className="photo-strip__track"
      data-clone={clone ? "true" : undefined}
      /* The first track is the measuring stick the effect reads; later copies follow it. */
      ref={clone ? undefined : trackRef}
    >
      {photos.map((entry) =>
        clone ? (
          /* The clone is the loop's scaffolding, not a second control: it repeats the same
             photo one track to the right, so a focusable copy would put every photo in the
             tab order twice and a clickable copy would open a dialog from a rectangle the
             reader is not looking at. `pointer-events: none` in the stylesheet finishes the
             job — the ghost never answers a click. */
          <button
            key={entry.src}
            type="button"
            className="photo-strip__clone"
            aria-hidden="true"
            tabIndex={-1}
          >
            {photo(entry)}
          </button>
        ) : (
          <Lightbox
            key={entry.src}
            src={entry.src}
            alt={text("photo.zoom")}
            width={entry.width}
            height={entry.height}
          >
            {photo(entry)}
          </Lightbox>
        ),
      )}
    </div>
  );

  return (
    <div
      className="photo-strip"
      data-strip={name}
      data-paused={paused ? "true" : undefined}
      ref={stripRef}
      onPointerEnter={holdForPointer}
      onPointerLeave={releaseForPointer}
      onFocus={holdForKeyboard}
      onBlur={releaseForKeyboard}
    >
      <div
        className="photo-strip__reel"
        /* The loop travels exactly one real track, not a percentage: with three or more
           copies a -50% shift would land mid-photo and jump. */
        style={{ "--strip-shift": `${-trackWidth}px` } as React.CSSProperties}
      >
        {Array.from({ length: copies }, (_, index) => track(index > 0, index))}
      </div>
    </div>
  );
}
