/**
 * 放大档：站内预览图 → 同一张原图（public/media/original/）。
 *
 * 每行都是同一画面：15 张照片墙的原图与预览图纯缩放之比对 RMSE < 2（像素级同一张），
 * 两张 iGEM 插图由 docx 源码里的原文件名钉死（.docx-extract/index.json 的 `descr`）。
 * 落地文件是 zip 母版重编的 WebP，长边封顶 2560：弹窗最大只画 96vw × 92vh，再高的像素
 * 上不了屏，只把点击后的等待拉长。
 *
 * 没有母版的图位不在此表 —— Lightbox 退回预览图，与改版前一样。tools/verify-originals.mjs
 * 逐行验存在、尺寸、字节上限，并验预览图确实在 public/media 下。
 */
export type Original = { src: string; width: number; height: number };

const ORIGINALS: Record<string, Original> = {
  "media/music-wall-1.webp": { src: "media/original/music-wall-1.webp", width: 1680, height: 1120 },
  "media/music-wall-2.webp": { src: "media/original/music-wall-2.webp", width: 1080, height: 1620 },
  "media/music-wall-3.webp": { src: "media/original/music-wall-3.webp", width: 1280, height: 1920 },
  "media/music-wall-4.webp": { src: "media/original/music-wall-4.webp", width: 1707, height: 2560 },
  "media/music-wall-5.webp": { src: "media/original/music-wall-5.webp", width: 2560, height: 1707 },
  "media/music-wall-6.webp": { src: "media/original/music-wall-6.webp", width: 1600, height: 1066 },
  "media/music-wall-7.webp": { src: "media/original/music-wall-7.webp", width: 1600, height: 1067 },
  "media/music-wall-8.webp": { src: "media/original/music-wall-8.webp", width: 1620, height: 1080 },
  "media/music-wall-9.webp": { src: "media/original/music-wall-9.webp", width: 1620, height: 1080 },
  "media/music-wall-10.webp": { src: "media/original/music-wall-10.webp", width: 1707, height: 2560 },
  "media/music-wall-11.webp": { src: "media/original/music-wall-11.webp", width: 1707, height: 2560 },
  "media/sport-wall-1.webp": { src: "media/original/sport-wall-1.webp", width: 1706, height: 2560 },
  "media/sport-wall-2.webp": { src: "media/original/sport-wall-2.webp", width: 2560, height: 1707 },
  "media/sport-wall-3.webp": { src: "media/original/sport-wall-3.webp", width: 1440, height: 1080 },
  "media/sport-wall-4.webp": { src: "media/original/sport-wall-4.webp", width: 1440, height: 960 },
  "media/sport-wall-5.webp": { src: "media/original/sport-wall-5.webp", width: 2560, height: 1707 },
  "media/igem-fig1-720.webp": { src: "media/original/igem-fig1-720.webp", width: 2560, height: 1920 },
  "media/igem-fig2-720.webp": { src: "media/original/igem-fig2-720.webp", width: 2560, height: 1437 },
};

/** `./media/x.webp` and `media/x.webp` name the same file. */
export function originalOf(src: string): Original | undefined {
  return ORIGINALS[src.replace(/^\.\//, "")];
}
