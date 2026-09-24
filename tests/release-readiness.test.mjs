import assert from "node:assert/strict";
import { test } from "node:test";

import { getReleaseReadinessIssues } from "../scripts/release-readiness.mjs";

const readyFixture = {
  name: "@waismeeran/ts-code-standards",
  version: "0.1.0",
  repository: { type: "git", url: "git+https://github.com/waismeeran/ts-code-standards.git" },
  homepage: "https://github.com/waismeeran/ts-code-standards#readme",
  bugs: { url: "https://github.com/waismeeran/ts-code-standards/issues" },
};

test("release readiness blocks the provisional package name", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, name: "@scope/js-style-guide" });

  assert.ok(issues.some((issue) => issue.includes("final npm package name")));
});

test("release readiness blocks the foundation version", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, version: "0.0.0-foundation" });

  assert.ok(issues.some((issue) => issue.includes("intentional release version")));
});

test("release readiness enforces the owner-approved package identity", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, name: "@other/ts-code-standards" });

  assert.ok(issues.some((issue) => issue.includes("owner-approved identity")));
});

test("release readiness rejects malformed scoped package names", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, name: "@waismeeran/Invalid Name" });

  assert.ok(issues.some((issue) => issue.includes("valid scoped npm package name")));
});

test("release readiness requires approved repository, homepage, and issue-tracker metadata", () => {
  const issues = getReleaseReadinessIssues({ ...readyFixture, repository: undefined, homepage: "", bugs: undefined });

  assert.ok(issues.some((issue) => issue.includes("repository metadata")));
  assert.ok(issues.some((issue) => issue.includes("homepage metadata")));
  assert.ok(issues.some((issue) => issue.includes("issue-tracker metadata")));
});

test("release readiness requires HTTPS canonical metadata", () => {
  const issues = getReleaseReadinessIssues({
    ...readyFixture,
    repository: { type: "git", url: "http://github.com/example-owner/ts-code-standards.git" },
  });

  assert.ok(issues.some((issue) => issue.includes("repository metadata")));
});

test("release readiness accepts npm's git+https repository URL convention", () => {
  assert.deepEqual(getReleaseReadinessIssues(readyFixture), []);
});

test("approved fixture metadata passes and a matching release tag is accepted", () => {
  assert.deepEqual(getReleaseReadinessIssues(readyFixture, { tag: "v0.1.0" }), []);
});

test("release readiness rejects malformed or mismatched tag references", () => {
  assert.ok(getReleaseReadinessIssues(readyFixture, { tag: "0.1.0" }).some((issue) => issue.includes("vX.Y.Z")));
  assert.ok(getReleaseReadinessIssues(readyFixture, { tag: "v01.2.3" }).some((issue) => issue.includes("vX.Y.Z")));
  assert.ok(getReleaseReadinessIssues({ ...readyFixture, version: "0.1.0-01" }).some((issue) => issue.includes("valid SemVer")));
  assert.ok(getReleaseReadinessIssues(readyFixture, { tag: "v0.1.1" }).some((issue) => issue.includes("does not match")));
});
