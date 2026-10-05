import { forwardToPortal } from "@/lib/portalProxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return forwardToPortal(request, "rows/check", "POST");
}
