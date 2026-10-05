import { redirect } from "next/navigation";

export default function FederationIndexPage() {
  redirect("/federation/submit");
}
