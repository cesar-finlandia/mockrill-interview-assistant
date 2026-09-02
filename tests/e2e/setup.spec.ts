// FR-10 (pre-call setup state), R-05 (voice output may be absent), NFR-04 (no key in client).
import { expect, test } from "@playwright/test";
import { probe, waitForApp } from "./helpers.js";

test.describe("Setup screen", () => {
  test("offers every role in the question bank and gates the call on choosing one", async ({ page }) => {
    await page.goto("/?sim=1");
    await waitForApp(page);
    await expect(page.getByTestId("screen-setup")).toBeVisible();

    const values = await page.locator("#role-select option").evaluateAll((os) =>
      os.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
    // The bank is the single source of the roles; a hard-coded list here would drift.
    const bankRoles = await page.evaluate(async () => {
      const res = await fetch("/engine/rag/question-bank.json");
      if (!res.ok) return null;
      return Object.keys(((await res.json()) as { roles: Record<string, unknown> }).roles);
    });
    expect(values.length).toBeGreaterThan(0);
    if (bankRoles) expect(values.sort()).toEqual(bankRoles.sort());

    const start = page.getByRole("button", { name: "Start screening call" });
    await expect(start).toBeDisabled();
    await page.selectOption("#role-select", values[0]!);
    await expect(start).toBeEnabled();
  });

  test("the microphone check reports a usable device", async ({ page }) => {
    await page.goto("/?sim=1");
    await waitForApp(page);
    await page.getByRole("button", { name: "Test microphone" }).click();
    // Chromium runs with a fake capture device, so the grant branch must report ready.
    await expect(page.getByText("Microphone ready")).toBeVisible();
  });

  test("theme selection applies without a reload", async ({ page }) => {
    await page.goto("/?sim=1");
    await waitForApp(page);
    await page.selectOption("#theme-select", "operator");
    await expect(page.locator("#theme-select")).toHaveValue("operator");
    const attr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(attr).toBe("operator");
  });

  test("no AssemblyAI credential is reachable from the browser (NFR-04)", async ({ page }) => {
    await page.goto("/?sim=1");
    await waitForApp(page);
    const leaked = await page.evaluate(() =>
      Object.keys(window as unknown as Record<string, unknown>).filter((k) => /assemblyai|api[_-]?key/i.test(k)),
    );
    expect(leaked).toEqual([]);
    const p = await probe(page);
    expect(JSON.stringify(p)).not.toMatch(/ASSEMBLYAI_API_KEY/);
  });
});
