import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { ForYou } from "./components/ForYou";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <Features />
      <HowItWorks />
      <ForYou />
      <CTA />
      <Footer />
    </div>
  );
}
