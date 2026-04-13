import { NextRequest } from "next/server";
import { GET as getEventById, runtime } from "@/app/api/events/[id]/route";

export { runtime };

export function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  return getEventById(req, {
    params: context.params.then(({ eventId }) => ({ id: eventId })),
  });
}
