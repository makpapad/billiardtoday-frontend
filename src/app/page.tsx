import { LandingSwitcher } from "./components/LandingSwitcher";
import { fetchWordpressHomeLanding } from "@/lib/wordpress";
import { WordpressLandingProvider } from "./components/landing/wordpressLanding";

export default async function HomePage() {
  let wordpressLanding = {};

  try {
    wordpressLanding = await fetchWordpressHomeLanding();
  } catch (error) {
    console.error("Failed to load WordPress home landing data:", error);
  }

  return (
    <WordpressLandingProvider value={wordpressLanding}>
      <LandingSwitcher />
    </WordpressLandingProvider>
  );
}
