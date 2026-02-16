import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WalletProvider } from "@/lib/near/wallet-context";
import { auth } from "../(auth)/auth";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <WalletProvider>
        <DataStreamProvider>
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={session?.user} />
            <SidebarInset className="shadow-[-8px_0_24px_rgba(0,0,0,0.08)] relative z-10">
              {children}
            </SidebarInset>
          </SidebarProvider>
        </DataStreamProvider>
      </WalletProvider>
    </>
  );
}
