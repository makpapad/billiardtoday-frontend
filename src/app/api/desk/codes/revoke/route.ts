import { forwardToDeskApi } from "@/lib/deskProxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return forwardToDeskApi(request, "desk-access/codes/revoke", "POST");
}
