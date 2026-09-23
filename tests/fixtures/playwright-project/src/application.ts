declare const test: { only(title: string, callback: () => void): void };

test.only("production code is outside Playwright scope", () => {});
