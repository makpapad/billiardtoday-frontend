import ObsOverlayClient from "@/components/overlay/ObsOverlayClient";

type OverlayPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <ObsOverlayClient searchParams={resolvedSearchParams} />;
}
