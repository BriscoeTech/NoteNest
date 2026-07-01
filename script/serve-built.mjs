import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const host = process.env.NOTENEST_HOST || "0.0.0.0";
const port = Number(process.env.NOTENEST_PORT || "5300");
const docsRoot = path.resolve(process.env.NOTENEST_DOCS_DIR || path.join(projectRoot, "docs"));
const pathBase = normalizePathBase(process.env.NOTENEST_PATH_BASE || "/NoteNest");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

function normalizePathBase(value) {
  if (!value || value === "/") return "";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

function isInsideRoot(filePath) {
  const relative = path.relative(docsRoot, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveStaticFile(appPath) {
  const normalizedAppPath = appPath === "/" ? "/index.html" : appPath;
  const decodedPath = decodeURIComponent(normalizedAppPath);
  const filePath = path.resolve(docsRoot, `.${decodedPath}`);
  if (!isInsideRoot(filePath)) return null;
  return filePath;
}

function shouldServeAppShell(request, appPath) {
  if (path.extname(appPath)) return false;
  const accept = request.headers.accept || "";
  return accept.includes("text/html") || accept.includes("*/*") || accept === "";
}

function cacheHeaderFor(filePath) {
  const name = path.basename(filePath);
  if (name === "index.html" || name === "sw.js" || name === "build-info.json") {
    return "no-store";
  }
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

function serveFile(request, response, appPath) {
  const requestedFile = resolveStaticFile(appPath);
  const filePath = requestedFile && fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()
    ? requestedFile
    : shouldServeAppShell(request, appPath)
      ? path.join(docsRoot, "index.html")
      : null;

  if (!filePath || !fs.existsSync(filePath)) {
    send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    "Cache-Control": cacheHeaderFor(filePath),
    "Content-Type": contentTypes.get(ext) || "application/octet-stream",
  };

  response.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(response);
}

function handleRequest(request, response) {
  const origin = `http://${request.headers.host || `${host}:${port}`}`;
  const url = new URL(request.url || "/", origin);

  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed\n", {
      "Allow": "GET, HEAD",
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }

  if (pathBase && url.pathname === pathBase) {
    response.writeHead(308, { "Location": `${pathBase}/` });
    response.end();
    return;
  }

  if (pathBase && !url.pathname.startsWith(`${pathBase}/`)) {
    send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const appPath = pathBase ? `/${url.pathname.slice(pathBase.length).replace(/^\/+/, "")}` : url.pathname;

  if (appPath === "/api/health") {
    send(response, 200, `${JSON.stringify({
      status: "ok",
      app: "NoteNest",
      pathBase,
      generatedAt: new Date().toISOString(),
    })}\n`, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    return;
  }

  if (request.method === "HEAD") {
    const filePath = resolveStaticFile(appPath);
    if (!filePath || !fs.existsSync(filePath)) {
      send(response, 404, "", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    send(response, 200, "", {
      "Cache-Control": cacheHeaderFor(filePath),
      "Content-Type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
    });
    return;
  }

  serveFile(request, response, appPath);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid NOTENEST_PORT: ${process.env.NOTENEST_PORT}`);
}

if (!fs.existsSync(path.join(docsRoot, "index.html"))) {
  throw new Error(`Built NoteNest index.html not found in ${docsRoot}. Run npm run build first.`);
}

const server = http.createServer(handleRequest);

server.listen(port, host, () => {
  console.log(`NoteNest listening on http://${host}:${port}${pathBase || "/"}`);
});
