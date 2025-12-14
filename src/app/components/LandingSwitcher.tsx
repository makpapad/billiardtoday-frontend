"use client";

import { useState } from "react";
import { ToggleLeft, ToggleRight, Sun, Moon, Minimize, Zap, Building2, Gamepad2 } from "lucide-react";

// Original Landing Components
import { Navigation } from "./landing/Navigation";
import { Hero } from "./landing/Hero";
import { Stats } from "./landing/Stats";
import { Features } from "./landing/Features";
import { HowItWorks } from "./landing/HowItWorks";
import { Audience } from "./landing/Audience";
import { FinalCTA } from "./landing/FinalCTA";
import { Footer } from "./landing/Footer";
import { LandingI18nProvider } from "./landing/i18n";

// Original Light Landing Components
import { OriginalLightNavigation } from "./landing/OriginalLightNavigation";
import { OriginalLightHero } from "./landing/OriginalLightHero";
import { OriginalLightStats } from "./landing/OriginalLightStats";
import { OriginalLightFeatures } from "./landing/OriginalLightFeatures";
import { OriginalLightHowItWorks } from "./landing/OriginalLightHowItWorks";
import { OriginalLightAudience } from "./landing/OriginalLightAudience";
import { OriginalLightFinalCTA } from "./landing/OriginalLightFinalCTA";
import { OriginalLightFooter } from "./landing/OriginalLightFooter";

// New Landing Components
import { NewNavigation } from "./landing/NewNavigation";
import { NewHero } from "./landing/NewHero";
import { NewFeatures } from "./landing/NewFeatures";
import { NewFooter } from "./landing/NewFooter";

// Light Landing Components
import { LightNavigation } from "./landing/LightNavigation";
import { LightHero } from "./landing/LightHero";
import { LightFeatures } from "./landing/LightFeatures";
import { LightFooter } from "./landing/LightFooter";

// Minimal Landing Components
import { MinimalNavigation } from "./landing/MinimalNavigation";
import { MinimalHero } from "./landing/MinimalHero";
import { MinimalFeatures } from "./landing/MinimalFeatures";
import { MinimalFooter } from "./landing/MinimalFooter";

// Dark Modern Landing Components
import { DarkModernNavigation } from "./landing/DarkModernNavigation";
import { DarkModernHero } from "./landing/DarkModernHero";
import { DarkModernFeatures } from "./landing/DarkModernFeatures";
import { DarkModernFooter } from "./landing/DarkModernFooter";

// Corporate Landing Components
import { CorporateNavigation } from "./landing/CorporateNavigation";
import { CorporateHero } from "./landing/CorporateHero";
import { CorporateFeatures } from "./landing/CorporateFeatures";
import { CorporateFooter } from "./landing/CorporateFooter";

// Sport Fun Landing Components
import { SportFunNavigation } from "./landing/SportFunNavigation";
import { SportFunHero } from "./landing/SportFunHero";
import { SportFunFeatures } from "./landing/SportFunFeatures";
import { SportFunFooter } from "./landing/SportFunFooter";

type LandingVersion = 'original' | 'original-light' | 'new' | 'light' | 'minimal' | 'dark-modern' | 'corporate' | 'sport-fun';

export function LandingSwitcher() {
  const [version, setVersion] = useState<LandingVersion>('original');

  const versions = {
    original: {
      name: 'Original',
      icon: Moon,
      color: 'blue',
      label: 'Version 1.0'
    },
    'original-light': {
      name: 'Orig Light',
      icon: Sun,
      color: 'yellow',
      label: 'Original Light'
    },
    new: {
      name: 'New',
      icon: ToggleRight,
      color: 'purple',
      label: 'Version 2.0'
    },
    light: {
      name: 'Light',
      icon: Sun,
      color: 'cyan',
      label: 'Light Theme'
    },
    minimal: {
      name: 'Minimal',
      icon: Minimize,
      color: 'gray',
      label: 'Minimal'
    },
    'dark-modern': {
      name: 'Dark Modern',
      icon: Zap,
      color: 'purple',
      label: 'Dark Modern'
    },
    corporate: {
      name: 'Corporate',
      icon: Building2,
      color: 'blue',
      label: 'Corporate'
    },
    'sport-fun': {
      name: 'Sport Fun',
      icon: Gamepad2,
      color: 'orange',
      label: 'Sport Fun'
    }
  };

  const currentVersion = versions[version];

  return (
    <div className="min-h-screen">
      {/* Switcher Panel */}
      {null}

      {/* Render Selected Landing Page */}
      {version === 'original' && (
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
      )}
      
      {version === 'original-light' && (
        <LandingI18nProvider>
          <OriginalLightNavigation />
          <main>
            <OriginalLightHero />
            <OriginalLightStats />
            <OriginalLightFeatures />
            <OriginalLightHowItWorks />
            <OriginalLightAudience />
            <OriginalLightFinalCTA />
          </main>
          <OriginalLightFooter />
        </LandingI18nProvider>
      )}
      
      {version === 'new' && (
        <>
          <NewNavigation />
          <main>
            <NewHero />
            <NewFeatures />
          </main>
          <NewFooter />
        </>
      )}
      
      {version === 'light' && (
        <>
          <LightNavigation />
          <main>
            <LightHero />
            <LightFeatures />
          </main>
          <LightFooter />
        </>
      )}
      
      {version === 'minimal' && (
        <>
          <MinimalNavigation />
          <main>
            <MinimalHero />
            <MinimalFeatures />
          </main>
          <MinimalFooter />
        </>
      )}
      
      {version === 'dark-modern' && (
        <>
          <DarkModernNavigation />
          <main>
            <DarkModernHero />
            <DarkModernFeatures />
          </main>
          <DarkModernFooter />
        </>
      )}
      
      {version === 'corporate' && (
        <>
          <CorporateNavigation />
          <main>
            <CorporateHero />
            <CorporateFeatures />
          </main>
          <CorporateFooter />
        </>
      )}
      
      {version === 'sport-fun' && (
        <>
          <SportFunNavigation />
          <main>
            <SportFunHero />
            <SportFunFeatures />
          </main>
          <SportFunFooter />
        </>
      )}
    </div>
  );
}
