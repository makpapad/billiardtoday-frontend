import { useMemo } from "react";
import { CmsPreviewPage } from "./pages/CmsPreviewPage";
import { StaticLandingPage } from "./pages/StaticLandingPage";

function resolveRouteFromLocation(): { type: "cms" | "static"; slug: string } {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("slug")?.trim();
  if (fromQuery) return { type: "cms", slug: fromQuery };

  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "cms" && parts[1]) return { type: "cms", slug: parts[1] };
  if (parts.length === 1 && parts[0]) return { type: "cms", slug: parts[0] };

  return { type: "static", slug: "home" };
}

export default function App() {
  const route = useMemo(() => resolveRouteFromLocation(), []);

  if (route.type === "cms") {
    return <CmsPreviewPage slug={route.slug} />;
  }

  return <StaticLandingPage />;
}
