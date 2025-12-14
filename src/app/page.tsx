import { LandingSwitcher } from "./components/LandingSwitcher";
import { fetchWordpressHomeLanding } from "@/lib/wordpress";
import { WordpressLandingProvider } from "./components/landing/wordpressLanding";

export default async function HomePage() {
  const wordpressLanding = await fetchWordpressHomeLanding();
  return (
    <WordpressLandingProvider value={wordpressLanding}>
      <LandingSwitcher />
    </WordpressLandingProvider>
  );
}
