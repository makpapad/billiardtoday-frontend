import { forwardToDeskApi } from "@/lib/deskProxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return forwardToDeskApi(request, `desk-access/tables/${encodeURIComponent(sessionId)}/release`, "POST");
}
