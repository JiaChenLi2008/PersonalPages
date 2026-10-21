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
 */
export type StripPhoto = {
  /** Path as the section figure writes it, e.g. `media/music-wall-1.webp`. */
  src: string;
  /** Intrinsic pixel size from public/media/MANIFEST.json (keeps the strip from shifting). */
  width: number;
  height: number;
};

export function PhotoStrip({ name, photos }: { name: string; photos: readonly StripPhoto[] }) {
  const track = (clone: boolean) => (
    <div className="photo-strip__track" data-clone={clone ? "true" : undefined}>
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
    <div className="photo-strip" data-strip={name} aria-hidden="true">
      <div className="photo-strip__reel">
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
