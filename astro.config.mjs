import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "astro/config";

function getCustomDomain() {
  const cnameFilePath = path.resolve("public/CNAME");

  if (!existsSync(cnameFilePath)) {
    return undefined;
  }

  const firstLine = readFileSync(cnameFilePath, "utf8")
    .split(/\r?\n/u)[0]
    ?.trim();

  return firstLine ? firstLine : undefined;
}

function getDefaultSite(customDomain) {
  const explicitSiteUrl = process.env.SITE_URL?.trim();

  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  if (customDomain) {
    return `https://${customDomain}`;
  }

  const [repositoryOwner, repositoryName] =
    process.env.GITHUB_REPOSITORY?.split("/") ?? [];

  if (repositoryOwner && repositoryName) {
    return `https://${repositoryOwner}.github.io/${repositoryName}`;
  }

  return "http://localhost";
}

const customDomain = getCustomDomain();
const site = getDefaultSite(customDomain);
const explicitBasePath = process.env.BASE_PATH?.trim();
const defaultBasePath = new URL(site).pathname || "/";
const basePath =
  explicitBasePath && explicitBasePath.length > 0
    ? explicitBasePath
    : defaultBasePath;
const normalizedBasePath =
  basePath === "/" ? "/" : `/${basePath.replace(/^\/+|\/+$/g, "")}/`;

export default defineConfig({
  site,
  base: normalizedBasePath,
});
