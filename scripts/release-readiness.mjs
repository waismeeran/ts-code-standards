import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PLACEHOLDER_NAME = "@scope/js-style-guide";
const PLACEHOLDER_VERSION = "0.0.0-foundation";
const APPROVED_PACKAGE_NAME = "@waismeeran/ts-code-standards";
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function getReleaseReadinessIssues(packageMetadata, { tag } = {}) {
  const issues = [];

  if (!packageMetadata.name || packageMetadata.name === PLACEHOLDER_NAME) {
    issues.push(`Choose the final npm package name (current placeholder: ${PLACEHOLDER_NAME}).`);
  } else if (!/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(packageMetadata.name)) {
    issues.push(`Package name ${packageMetadata.name} is not a valid scoped npm package name.`);
  } else if (packageMetadata.name !== APPROVED_PACKAGE_NAME) {
    issues.push(`Package name must match the owner-approved identity ${APPROVED_PACKAGE_NAME}.`);
  }

  if (!packageMetadata.version || packageMetadata.version === PLACEHOLDER_VERSION) {
    issues.push(`Choose an intentional release version (current placeholder: ${PLACEHOLDER_VERSION}).`);
  } else if (!isValidSemver(packageMetadata.version)) {
    issues.push(`Package version ${packageMetadata.version} is not a valid SemVer version.`);
  }

  if (!hasMetadataValue(packageMetadata.repository, { allowGitHttps: true })) {
    issues.push("Add the canonical HTTPS repository metadata after the repository identity is approved.");
  }

  if (!hasMetadataValue(packageMetadata.homepage)) {
    issues.push("Add the approved project homepage metadata.");
  }

  if (!hasMetadataValue(packageMetadata.bugs)) {
    issues.push("Add the approved issue-tracker metadata.");
  }

  if (tag !== undefined) {
    if (typeof tag !== "string" || !tag.startsWith("v") || !isValidSemver(tag.slice(1))) {
      issues.push("Release reference must use the vX.Y.Z tag convention (optional prerelease/build suffixes are allowed).");
    } else if (packageMetadata.version && tag !== `v${packageMetadata.version}`) {
      issues.push(`Release reference ${tag} does not match package version ${packageMetadata.version}.`);
    }
  }

  return issues;
}

function isValidSemver(version) {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) return false;

  const prereleaseIdentifiers = match[4]?.split(".") ?? [];
  return prereleaseIdentifiers.every((identifier) => !/^\d+$/.test(identifier) || identifier === "0" || !identifier.startsWith("0"));
}

function hasMetadataValue(value, { allowGitHttps = false } = {}) {
  if (typeof value === "string") return isWebUrl(value, { allowGitHttps });
  if (value && typeof value === "object") {
    return isWebUrl(value.url, { allowGitHttps });
  }
  return false;
}

function isWebUrl(value, { allowGitHttps = false } = {}) {
  if (typeof value !== "string") return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || (allowGitHttps && protocol === "git+https:");
  } catch {
    return false;
  }
}

async function main() {
  const packagePath = new URL("../package.json", import.meta.url);
  const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
  const args = process.argv.slice(2);
  let tag;

  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== "--tag") {
      console.error("Usage: node scripts/release-readiness.mjs [--tag vX.Y.Z]");
      process.exitCode = 2;
      return;
    }
    [tag] = args.slice(1);
  }

  const issues = getReleaseReadinessIssues(packageMetadata, { tag });
  if (issues.length > 0) {
    console.error("Release readiness: BLOCKED");
    for (const issue of issues) console.error(`- ${issue}`);
    console.error("This check does not contact npm or GitHub and never publishes.");
    process.exitCode = 1;
    return;
  }

  console.log("Release metadata and reference are ready for owner review.");
  console.log("This check does not contact npm or GitHub and never publishes.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
