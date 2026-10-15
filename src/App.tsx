import { Reveal } from "./components/primitives/Reveal";
import { Elder } from "./sections/Elder/Elder";
import { Footer } from "./sections/Footer/Footer";
import { Hero } from "./sections/Hero/Hero";
import { Index } from "./sections/Index/Index";
import { Method } from "./sections/Method/Method";
import { Music } from "./sections/Music/Music";
import { Nav } from "./sections/Nav/Nav";
import { PhotoBand } from "./sections/PhotoBand/PhotoBand";
import { Scholarly } from "./sections/Scholarly/Scholarly";
import { Sport } from "./sections/Sport/Sport";
import { Values } from "./sections/Values/Values";

/** Page shell: the frozen eleven-section order from ui.pen. Section layout lands in later lanes. */
export function App() {
  return (
    <>
      <Nav />
      <main>
        <Reveal>
          <Hero />
        </Reveal>
        <PhotoBand />
        <Index />
        <Scholarly />
        <Elder />
        <Music />
        <Sport />
        <Method />
        <Values />
      </main>
      <Footer />
    </>
  );
}
