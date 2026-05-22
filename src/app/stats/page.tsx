import { redirect } from "next/navigation";

export default function StatsIndexPage() {
  redirect("/stats/player-rankings");
}
