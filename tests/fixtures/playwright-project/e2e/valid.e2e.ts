interface Locator {
  click(): Promise<void>;
}

interface Page {
  goto(url: string): Promise<void>;
  getByRole(role: string): Locator;
  waitForTimeout(milliseconds: number): Promise<void>;
}

interface TestFunction {
  (title: string, callback: (fixtures: { page: Page }) => void | Promise<void>): void;
  only: TestFunction;
  skip: TestFunction;
}

declare const test: TestFunction;
declare function expect(locator: Locator): { toBeVisible(): Promise<void> };

test("home page has a working primary action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button")).toBeVisible();
});
