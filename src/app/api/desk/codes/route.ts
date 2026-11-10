import { forwardToDeskApi } from "@/lib/deskProxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return forwardToDeskApi(request, "desk-access/codes", "GET");
}

export async function POST(request: Request) {
  return forwardToDeskApi(request, "desk-access/codes", "POST");
}
