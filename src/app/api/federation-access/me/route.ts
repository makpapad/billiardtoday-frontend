import { forwardToPortal } from "@/lib/portalProxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return forwardToPortal(request, "me", "GET");
}
