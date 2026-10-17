// app/(portal)/layout.tsx — wraps every role portal in the session-gated
// sidebar shell. Route-level role gating is enforced by proxy.ts; this layout
// only handles the shell + client session state.

import { PortalSidebar } from "@/components/portal/sidebar";

export default function PortalLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return <PortalSidebar>{children}</PortalSidebar>;
}
