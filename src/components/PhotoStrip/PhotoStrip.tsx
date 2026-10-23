import { useEffect, useRef, useState } from "react";
import "./PhotoStrip.css";

/**
 * PhotoStrip: the drifting wall of photographs the docx adds to two sections —
 * Music (页面6, "依次滚动播放" over nine photos) and Sport (页面7, "先放照片滚动墙",
 * four photos). Both walls are this one component; the task forbids a second copy, and
 * the geometry, the seamless loop and the reduced-motion fallback are identical.
 *
 * The wall is decoration. It is `aria-hidden` with `alt=""`, the same treatment the
 * Index thumbnails and the section figures get (BLUEPRINT §6.3): the frozen dictionaries
 * carry no alt key for these thirteen assets, so describing them would mean inventing
 * copy this lane may not add.
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
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /* One track is the real copy; `copies - 1` clones follow it. Two is the floor: the
     animation needs a second copy to travel into even when one track already overflows. */
  const [copies, setCopies] = useState(2);
  const [trackWidth, setTrackWidth] = useState(0);

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

  const track = (clone: boolean, index: number) => (
    <div
      key={index}
      className="photo-strip__track"
      data-clone={clone ? "true" : undefined}
      /* The first track is the measuring stick the effect reads; later copies follow it. */
      ref={clone ? undefined : trackRef}
    >
      {photos.map((photo) => (
        <img
          key={photo.src}
          className="photo-strip__img"
          src={photo.src}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );

  return (
    <div className="photo-strip" data-strip={name} aria-hidden="true" ref={stripRef}>
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
