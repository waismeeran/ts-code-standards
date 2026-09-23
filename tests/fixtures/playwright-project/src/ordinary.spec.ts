declare const test: { only(title: string, callback: () => void): void };

test.only("unit-test-like spec files are not E2E by default", () => {});
