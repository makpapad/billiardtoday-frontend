import { AccountSessionProvider } from "@/components/account/AccountSessionProvider";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountSessionProvider>{children}</AccountSessionProvider>;
}
