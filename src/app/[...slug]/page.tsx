import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchWordpressNavMenu, fetchWordpressPageBySlug } from "@/lib/wordpress";
import { WpPageTemplate } from "@/app/components/wp/WpPageTemplate";

type Params = {
  slug: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const slugParts = awaitedParams.slug;
  if (slugParts.length !== 1) return {};

  const page = await fetchWordpressPageBySlug(slugParts[0]);
  if (!page) return {};

  return {
    title: page.title,
  };
}

export default async function WordpressCatchAllPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const awaitedParams = await params;
  const slugParts = awaitedParams.slug;

  // Only support single-segment pages like /about, /pricing.
  // Multi-segment routes belong to the Next app.
  if (slugParts.length !== 1) {
    notFound();
  }

  const page = await fetchWordpressPageBySlug(slugParts[0]);
  if (!page) {
    notFound();
  }

  const navItems = await fetchWordpressNavMenu();

  return (
    <WpPageTemplate title={page.title} navItems={navItems}>
      <article dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
    </WpPageTemplate>
  );
}
