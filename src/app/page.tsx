import { Navigation } from "./components/landing/Navigation";
import { Hero } from "./components/landing/Hero";
import { Stats } from "./components/landing/Stats";
import { Features } from "./components/landing/Features";
import { HowItWorks } from "./components/landing/HowItWorks";
import { Audience } from "./components/landing/Audience";
import { FinalCTA } from "./components/landing/FinalCTA";
import { Footer } from "./components/landing/Footer";
import { LandingI18nProvider } from "./components/landing/i18n";

export default function HomePage() {
  return (
    <LandingI18nProvider>
      <Navigation />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Audience />
        <FinalCTA />
      </main>
      <Footer />
    </LandingI18nProvider>
  );
}
