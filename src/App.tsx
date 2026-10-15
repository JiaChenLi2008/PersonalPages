import { Reveal } from "./components/primitives/Reveal";
import { Footer } from "./sections/Footer/Footer";
import { Hero } from "./sections/Hero/Hero";
import { Index } from "./sections/Index/Index";
import { Method } from "./sections/Method/Method";
import { Nav } from "./sections/Nav/Nav";
import { PhotoBand } from "./sections/PhotoBand/PhotoBand";
import { Values } from "./sections/Values/Values";

/** Page shell: section order only. Copy and section layout land in later lanes. */
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
        <Method />
        <Values />
      </main>
      <Footer />
    </>
  );
}
