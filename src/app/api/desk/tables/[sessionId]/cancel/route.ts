import { forwardToDeskApi } from "@/lib/deskProxy";

export const dynamic = "force-dynamic";

/** Αφαίρεση αγώνα από το τραπέζι: σβήνει το session, ο αγώνας ξαναγυρνά στη λίστα. */
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return forwardToDeskApi(request, `desk-access/tables/${encodeURIComponent(sessionId)}/cancel`, "POST");
}
