import ObsOverlayClient from "@/components/overlay/ObsOverlayClient";

type OverlayScreenPageProps = {
  params: Promise<{
    screen: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

function splitScreenPathParam(screen: string): {
  screen: string;
  extraSearchParams: Record<string, string>;
} {
  const [screenValue, ...rawParamParts] = screen.split("&");
  const extraSearchParams: Record<string, string> = {};

  rawParamParts.forEach((part) => {
    const [rawKey, ...rawValueParts] = part.split("=");
    const key = rawKey?.trim();
    if (!key) return;
    extraSearchParams[key] = rawValueParts.join("=").trim();
  });

  return {
    screen: screenValue.trim() || screen,
    extraSearchParams,
  };
}

export default async function OverlayScreenPage({
  params,
  searchParams,
}: OverlayScreenPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const normalizedPathParams = splitScreenPathParam(resolvedParams.screen);

  return (
    <ObsOverlayClient
      searchParams={{
        ...normalizedPathParams.extraSearchParams,
        ...resolvedSearchParams,
        screen: normalizedPathParams.screen,
      }}
    />
  );
}
