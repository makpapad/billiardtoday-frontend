import ObsOverlayClient from "@/components/overlay/ObsOverlayClient";

type OverlayPageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  return <ObsOverlayClient searchParams={resolvedSearchParams} />;
}
