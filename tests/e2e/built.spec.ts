// NFR-08 — the artefact that actually deploys. Runs against `vite build` output served by
// `vite preview`, so a bundling regression (an externalized node builtin, a dead alias) is
// caught here rather than on the Vercel URL an hour before the deadline.
import { expect, test } from "@playwright/test";
import { probe, waitForApp } from "./helpers.js";

test.describe("Production bundle", () => {
  test("serves /health", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
  });

  test("runs a complete interview from the built bundle with no console errors", async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (e) => failures.push(String(e)));

    await page.goto("/?sim=1");
    await waitForApp(page);
    await page.selectOption("#role-select", "junior-frontend");
    await page.getByRole("button", { name: "Start screening call" }).click();
    await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });

    const p = await probe(page);
    expect(p.scorecard!.per_question.length).toBeGreaterThan(0);
    expect(p.scorecard!.overall).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  test("re-drills from the built bundle", async ({ page }) => {
    await page.goto("/?sim=1");
    await waitForApp(page);
    await page.selectOption("#role-select", "junior-frontend");
    await page.getByRole("button", { name: "Start screening call" }).click();
    await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Re-drill this answer" }).click();
    await expect(page.getByTestId("screen-drill")).toBeVisible();
    await expect(page.locator('[data-testid="screen-drill"] table')).toBeVisible({ timeout: 45_000 });
  });
});
