// FR-12 (/health), FR-13 rung 2 (degraded live), NFR-01/NFR-02 (nothing throws at the UI),
// NFR-04 (one server-side secret, never in the client).
import { expect, test } from "@playwright/test";
import { probe, waitForApp } from "./helpers.js";

test.describe("Health and deploy surface", () => {
  test("GET /health returns 200 with an ok body (FR-12)", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; version: string };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
  });

  test("GET /api/aai-token never leaks the key and never 500s", async ({ request }) => {
    const res = await request.get("/api/aai-token");
    // 200 with a short-lived token when a key is configured; 503 with a DegradedResult when
    // it is not. Both are designed outcomes — an unhandled 500 is not.
    expect([200, 503]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/ASSEMBLYAI_API_KEY/);
    if (res.status() === 200) {
      const body = JSON.parse(text) as { token: string; expires_in_seconds: number };
      expect(typeof body.token).toBe("string");
      expect(body.expires_in_seconds).toBeGreaterThan(0);
    } else {
      const body = JSON.parse(text) as { degraded: boolean; fallback_source: string };
      expect(body.degraded).toBe(true);
      expect(["cache", "none", "replay", "secondary_provider"]).toContain(body.fallback_source);
    }
  });

  test("POST /api/turn always answers with a usable action (NFR-02)", async ({ request }) => {
    const res = await request.post("/api/turn", {
      data: { session_id: "e2e", asked: [], last_turn: null, role: "junior-frontend" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { say: string; done: boolean; degraded: boolean };
    expect(typeof body.say).toBe("string");
    expect(body.say.length).toBeGreaterThan(0);
    expect(typeof body.done).toBe("boolean");
  });

  test("the served bundle contains no credential (NFR-04)", async ({ request, baseURL }) => {
    const html = await (await request.get("/")).text();
    const scripts = [...html.matchAll(/src="([^"]+\.[jt]sx?)"/g)].map((m) => m[1]!);
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      const js = await (await request.get(new URL(src, baseURL).toString())).text();
      // A 32-hex AssemblyAI key or the env var name must never reach the browser.
      expect(js).not.toMatch(/ASSEMBLYAI_API_KEY\s*[:=]\s*["'][^"']+["']/);
    }
  });
});

test.describe("Degraded demo (ladder rung 2)", () => {
  test("without a working token the app still runs a full interview and says why", async ({ page }) => {
    // No ?sim=1: the app probes /api/aai-token. With no key configured (or
    // RES_FORCED_DEGRADED=1 in the serving env) it must fall back to the golden session
    // rather than asking for a microphone and then stalling.
    test.skip(Boolean(process.env.ASSEMBLYAI_API_KEY), "a live key is configured; rung 1 applies");

    await page.goto("/");
    await waitForApp(page);
    await page.selectOption("#role-select", "junior-frontend");
    await page.getByRole("button", { name: "Start screening call", exact: true }).click();

    // The badge is visible and explains itself as designed behaviour.
    const banner = page.getByRole("alert").first();
    await expect(banner).toBeVisible({ timeout: 30_000 });
    await expect(banner).toContainText("cached session data");

    await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });
    const p = await probe(page);
    expect(p.degraded).toBe(true);
    expect(p.scorecard!.per_question.length).toBeGreaterThan(0);
  });

  test("no uncaught exception reaches the page during a whole session (NFR-02)", async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (e) => failures.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("Failed to load resource")) failures.push(m.text());
    });

    await page.goto("/?sim=1");
    await waitForApp(page);
    await page.selectOption("#role-select", "junior-frontend");
    await page.getByRole("button", { name: "Start screening call", exact: true }).click();
    await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });

    expect(failures).toEqual([]);
  });
});
