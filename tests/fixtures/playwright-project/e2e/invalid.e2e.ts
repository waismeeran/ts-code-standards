interface Locator {
  click(): Promise<void>;
}

interface Page {
  goto(url: string): Promise<void>;
  getByRole(role: string): Locator;
  waitForTimeout(milliseconds: number): Promise<void>;
  waitForResponse(url: string): Promise<unknown>;
}

interface TestFunction {
  (title: string, callback: (fixtures: { page: Page }) => void | Promise<void>): void;
  only: TestFunction;
}

declare const test: TestFunction;
declare function expect(locator: Locator): { toBeVisible(): Promise<void> };

test.only("focused test with async mistakes", async ({ page }) => {
  page.waitForResponse("/api");
  await page.waitForTimeout(250);
  await expect(page.getByRole("button")).toBeVisible();
});

export async function later(): Promise<void> {}
later();
