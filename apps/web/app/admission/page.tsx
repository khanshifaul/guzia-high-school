// app/admission/page.tsx — the public online admission form (no login),
// as a four-step wizard (specs/06 §public: "4-step wizard (student info →
// guardian info → academic choice → review+submit), zod schema per step").
//
// Each step is validated by its own zod schema before the applicant can
// move on, and the message appears next to the offending field rather than
// in a banner. The server validates everything again on submit — the
// schemas here guide the applicant, they never replace the server.
//
// The file uploads (photo, birth certificate, testimonial) happen on the
// academic step; the returned URLs ride along with the payload.
//
// `?print=1` switches the page to the printable application sheet: the
// application as an A4 document, with no form controls and no chrome. The
// flag is read here, on the server, so the client component needs no
// `useSearchParams()` (and no Suspense boundary around it).

import AdmissionClient from "./admission-client";

export default async function AdmissionPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const query = await searchParams;
    const print = query.print === "1";

    return <AdmissionClient print={print} />;
}
