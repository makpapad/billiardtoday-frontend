import { forwardToDeskApi } from "@/lib/deskProxy";

export const dynamic = "force-dynamic";

/** Ανοιχτοί αγώνες του χειριστή (για «Συνέχεια» από άλλη συσκευή). */
export async function GET(request: Request) {
  return forwardToDeskApi(request, "desk-access/tables/open", "GET");
}
