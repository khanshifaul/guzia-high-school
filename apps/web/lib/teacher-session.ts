"use client";

// lib/teacher-session.ts — resolve the logged-in teacher's linked ids from
// /auth/me (which returns teacherId for TEACHER sessions).

import { useEffect, useState } from "react";
import { api } from "./api";

export interface TeacherMe {
    id: string;
    email: string;
    fullName: string;
    role: string;
    teacherId: string | null;
}

export function useMyTeacher() {
    const [me, setMe] = useState<TeacherMe | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<{ data: TeacherMe }>("/auth/me")
            .then((payload) => setMe(payload.data))
            .catch(() => setMe(null))
            .finally(() => setLoading(false));
    }, []);

    return { me, loading, teacherId: me?.teacherId ?? null, fullName: me?.fullName ?? "" };
}
