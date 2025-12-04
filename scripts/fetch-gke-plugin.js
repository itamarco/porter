#!/usr/bin/env node
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const tar = require("tar");

const BASE_URL = "https://dl.google.com/dl/cloudsdk/channels/rapid/";
const MANIFEST_URL = `${BASE_URL}components-2.json`;
const TARGETS = [
  { id: "gke-gcloud-auth-plugin-darwin-arm", archDir: "darwin-arm64" },
  { id: "gke-gcloud-auth-plugin-darwin-x86_64", archDir: "darwin-x64" },
];
const PLUGIN_ROOT = path.join(__dirname, "..", "electron", "resources", "bin");

async function main() {
  console.log("Downloading GKE auth plugin manifest...");
  const manifest = await fetchJson(MANIFEST_URL);
  const components = manifest.components || [];

  for (const target of TARGETS) {
    console.log(`Preparing ${target.id}...`);
    const component = components.find((entry) => entry.id === target.id);
    if (!component) {
      throw new Error(`Component ${target.id} is missing from manifest`);
    }

    const archiveUrl = `${BASE_URL}${component.data.source}`;
    const archivePath = path.join(os.tmpdir(), path.basename(component.data.source));
    await downloadFile(archiveUrl, archivePath);

    const destDir = path.join(PLUGIN_ROOT, target.archDir);
    await fs.promises.mkdir(destDir, { recursive: true });

    try {
      await tar.extract({
        file: archivePath,
        cwd: destDir,
        strip: 1,
        filter: (entryPath) => entryPath.endsWith("bin/gke-gcloud-auth-plugin"),
      });

      const pluginPath = path.join(destDir, "gke-gcloud-auth-plugin");
      await fs.promises.chmod(pluginPath, 0o755);
    } finally {
      await fs.promises.unlink(archivePath).catch(() => {});
    }
  }

  console.log("GKE auth plugin binaries are ready.");
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download manifest: ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destination);

    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          fileStream.close();
          fs.promises.unlink(destination).catch(() => {});
          reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
          return;
        }

        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close(() => resolve(destination));
        });

        fileStream.on("error", (error) => {
          fs.promises.unlink(destination).catch(() => {});
          reject(error);
        });
      })
      .on("error", (error) => {
        fs.promises.unlink(destination).catch(() => {});
        reject(error);
      });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

