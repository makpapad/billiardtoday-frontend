import { forwardToDeskApi } from "@/lib/deskProxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return forwardToDeskApi(request, "club-portal/events", "GET");
}
