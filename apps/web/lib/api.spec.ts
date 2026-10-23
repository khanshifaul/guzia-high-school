// lib/api.spec.ts — protects the error path the browser shows a user.
// A gateway that answers 502 with an HTML page (Render cold start) must not
// surface as a JSON parse error, and login must retry it before giving up.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, RequestError, SERVER_WAKING_MESSAGE } from "./api";
import { login } from "./auth-client";

const GATEWAY_HTML =
    "<!DOCTYPE html><html><head><title>Bad Gateway</title></head><body>502</body></html>";

function response(status: number, body: string): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => body,
    } as Response;
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("api() transient gateway retry", () => {
    it("recovers when the gateway wakes up after two 502s", async () => {
        fetchMock
            .mockResolvedValueOnce(response(502, GATEWAY_HTML))
            .mockResolvedValueOnce(response(502, GATEWAY_HTML))
            .mockResolvedValueOnce(response(200, '{"data":{"user":{"id":"u1"}}}'));

        const call = api<{ data: { user: { id: string } } }>("/auth/login", {
            method: "POST",
            body: { email: "admin@guziahs.edu", password: "secret" },
            retryTransient: true,
        });
        await vi.advanceTimersByTimeAsync(5_000);

        await expect(call).resolves.toEqual({ data: { user: { id: "u1" } } });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("rejects with the waking message, not a parse error, after three 502s", async () => {
        fetchMock.mockImplementation(async () => response(502, GATEWAY_HTML));

        const call = api("/auth/login", {
            method: "POST",
            body: { email: "admin@guziahs.edu", password: "secret" },
            retryTransient: true,
        });
        const rejection = expect(call).rejects.toThrow(SERVER_WAKING_MESSAGE);
        await vi.advanceTimersByTimeAsync(10_000);
        await rejection;

        const caught = await call.catch((err: unknown) => err);
        expect(caught).toBeInstanceOf(RequestError);
        expect((caught as RequestError).statusCode).toBe(502);
        expect((caught as Error).message).not.toContain("<!DOCTYPE");
        expect((caught as Error).message).not.toContain("<html");
        expect((caught as Error).message).not.toContain("Unexpected token");
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("does not re-send a call that did not opt in", async () => {
        fetchMock.mockImplementation(async () => response(502, GATEWAY_HTML));

        await expect(
            api("/auth/logout", { method: "POST" }),
        ).rejects.toThrow(SERVER_WAKING_MESSAGE);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe("api() error bodies", () => {
    it("keeps the API's own 401 detail and makes one request", async () => {
        fetchMock.mockResolvedValueOnce(
            response(401, '{"message":"Invalid email or password","error":"Unauthorized","statusCode":401}'),
        );

        const call = api("/auth/login", {
            method: "POST",
            body: { email: "admin@guziahs.edu", password: "wrong" },
            retryTransient: true,
        });

        await expect(call).rejects.toThrow("Invalid email or password");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("lets the status drive the message when the body is not JSON", async () => {
        fetchMock.mockResolvedValueOnce(response(500, "<html>oops</html>"));

        await expect(api("/notices")).rejects.toThrow("Request failed (500)");
    });

    it("resolves null for a 200 with an empty body", async () => {
        fetchMock.mockResolvedValueOnce(response(200, ""));

        await expect(api("/health")).resolves.toBeNull();
    });
});

describe("login()", () => {
    it("is the caller that rides out a cold start", async () => {
        fetchMock
            .mockResolvedValueOnce(response(502, GATEWAY_HTML))
            .mockResolvedValueOnce(
                response(200, '{"data":{"user":{"id":"u1","email":"admin@guziahs.edu"}}}'),
            );

        const call = login("admin@guziahs.edu", "secret");
        await vi.advanceTimersByTimeAsync(5_000);

        await expect(call).resolves.toMatchObject({ id: "u1" });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
