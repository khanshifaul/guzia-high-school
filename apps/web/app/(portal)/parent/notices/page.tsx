"use client";

// app/(portal)/parent/notices/page.tsx — school notices (audience-filtered).

import * as React from "react";
import { FaBullhorn } from "react-icons/fa6";
import { PageHeader } from "@/components/shared/page-header";
import { NoticesList } from "@/components/shared/notices-list";

export default function ParentNoticesPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Notices" subtitle="Announcements from the school" icon={FaBullhorn} />
            <NoticesList />
        </div>
    );
}
