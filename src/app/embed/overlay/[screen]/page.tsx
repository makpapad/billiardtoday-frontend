import ObsOverlayClient from "@/components/overlay/ObsOverlayClient";

type OverlayScreenPageProps = {
  params: Promise<{
    screen: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function OverlayScreenPage({
  params,
  searchParams,
}: OverlayScreenPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <ObsOverlayClient
      searchParams={{
        ...resolvedSearchParams,
        screen: resolvedParams.screen,
      }}
    />
  );
}
