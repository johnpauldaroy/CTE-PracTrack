import { AccountsPage } from "@/components/admin/accounts/accounts-page";

export default async function Accounts({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <AccountsPage initialTab={tab} />;
}
