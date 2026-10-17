"use client";

// lib/student-session.ts — resolve the logged-in student's linked ids from
// /auth/me (which returns studentId + classId for STUDENT sessions).

import { useEffect, useState } from "react";
import { api } from "./api";

export interface StudentMe {
    id: string;
    email: string;
    fullName: string;
    role: string;
    studentId: string | null;
    classId: string | null;
}

export function useMyStudent() {
    const [me, setMe] = useState<StudentMe | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<{ data: StudentMe }>("/auth/me")
            .then((payload) => setMe(payload.data))
            .catch(() => setMe(null))
            .finally(() => setLoading(false));
    }, []);

    return { me, loading, studentId: me?.studentId ?? null, classId: me?.classId ?? null };
}
