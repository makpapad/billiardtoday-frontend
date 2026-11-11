/**
 * Το page είναι client component με `useSearchParams()`, άρα δεν μπορεί να δηλώσει
 * route config μόνο του. Χωρίς αυτό το build σκάει στο prerender
 * («useSearchParams() should be wrapped in a suspense boundary») — το έκρυβε το
 * `force-dynamic` του root layout, που αφαιρέθηκε στις 11/11/2026.
 */
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
