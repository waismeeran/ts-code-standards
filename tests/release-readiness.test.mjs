import assert from "node:assert/strict";
import { test } from "node:test";

import { getReleaseReadinessIssues } from "../scripts/release-readiness.mjs";

const readyFixture = {
  name: "@example/fixture-package",
  version: "1.2.3",
  repository: { type: "git", url: "https://example.invalid/owner/repository.git" },
  homepage: "https://example.invalid/owner/repository",
  bugs: { url: "https://example.invalid/owner/repository/issues" },
};

test("release readiness blocks the provisional package name", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, name: "@scope/js-style-guide" });

  assert.ok(issues.some((issue) => issue.includes("final npm package name")));
});

test("release readiness blocks the foundation version", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, version: "0.0.0-foundation" });

  assert.ok(issues.some((issue) => issue.includes("intentional release version")));
});

test("release readiness requires approved repository, homepage, and issue-tracker metadata", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, repository: undefined, homepage: "", bugs: undefined });

  assert.ok(issues.some((issue) => issue.includes("repository metadata")));
  assert.ok(issues.some((issue) => issue.includes("homepage metadata")));
  assert.ok(issues.some((issue) => issue.includes("issue-tracker metadata")));
});

test("approved fixture metadata passes and a matching release tag is accepted", () => {
  assert.deepEqual(getReleaseReadinessIssues(readyFixture, { tag: "v1.2.3" }), []);
});

test("release readiness rejects malformed or mismatched tag references", () => {
  assert.ok(getReleaseReadinessIssues(readyFixture, { tag: "1.2.3" }).some((issue) => issue.includes("vX.Y.Z")));
  assert.ok(getReleaseReadinessIssues(readyFixture, { tag: "v01.2.3" }).some((issue) => issue.includes("vX.Y.Z")));
  assert.ok(getReleaseReadinessIssues({ ...readyFixture, version: "1.2.3-01" }).some((issue) => issue.includes("valid SemVer")));
  assert.ok(getReleaseReadinessIssues(readyFixture, { tag: "v1.2.4" }).some((issue) => issue.includes("does not match")));
});
