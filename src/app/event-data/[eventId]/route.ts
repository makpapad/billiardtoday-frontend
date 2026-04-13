import { NextRequest } from "next/server";
import { GET as getEventById } from "@/app/api/events/[id]/route";

export const runtime = "nodejs";

export function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  return getEventById(req, {
    params: context.params.then(({ eventId }) => ({ id: eventId })),
  });
}
