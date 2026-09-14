import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Shape of the inspection hook App.tsx publishes on window (see src/mockrill/ui/App.tsx). */
export type MockrillProbe = {
  envelopes: Array<{
    step_id: string;
    status: string;
    payload: Record<string, unknown>;
    sequence: number;
    degraded?: boolean;
    timestamp: string;
  }>;
  screen: string;
  sessionState: string;
  scorecard: {
    session_id: string;
    overall: number;
    filler_total: number;
    weakest_question_id: string | null;
    degraded: boolean;
    per_question: Array<{
      question_id: string;
      turn_order: number;
      overall: number;
      axes: Record<string, number>;
      evidence: Array<{ kind: string; text: string; label: string; start_ms: number; end_ms: number; note: string }>;
      source: string;
    }>;
  } | null;
  degraded: boolean;
  mode: string;
  source: string;
};

export async function probe(page: Page): Promise<MockrillProbe> {
  return page.evaluate(() => (window as unknown as { __mockrill: MockrillProbe }).__mockrill);
}

/** Wait until the app has published a probe at all (React has mounted and run its effects). */
export async function waitForApp(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean((window as unknown as { __mockrill?: unknown }).__mockrill));
}

/** Open Setup, pick a role, and start the call. */
export async function startCall(page: Page, opts: { url?: string; role?: string } = {}): Promise<void> {
  await page.goto(opts.url ?? "/?sim=1");
  await waitForApp(page);
  await expect(page.getByTestId("screen-setup")).toBeVisible();
  await page.selectOption("#role-select", opts.role ?? "junior-frontend");
  await page.getByRole("button", { name: "Start screening call", exact: true }).click();
  await expect(page.getByTestId("screen-live")).toBeVisible();
}

/** Run a whole simulated interview and land on the scorecard. */
export async function runInterviewToScorecard(page: Page, opts: { url?: string; role?: string } = {}): Promise<void> {
  await startCall(page, opts);
  await expect(page.getByTestId("screen-scorecard")).toBeVisible({ timeout: 60_000 });
}

export function stepIds(p: MockrillProbe): string[] {
  return p.envelopes.map((e) => e.step_id);
}

export function envelopesOf(p: MockrillProbe, stepId: string) {
  return p.envelopes.filter((e) => e.step_id === stepId);
}
