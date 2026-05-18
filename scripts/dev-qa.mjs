import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientPort = process.env.QA_CLIENT_PORT || "5183";
const serverPort = process.env.QA_SERVER_PORT || "4115";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
const children = [];
let shuttingDown = false;

function run(command, args, envPatch = {}) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...envPatch
    },
    stdio: "inherit"
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      stop();
      process.exit(code);
    }
  });
  return child;
}

function stop() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  stop();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(143);
});
process.on("exit", stop);

run(process.execPath, ["server/index.js"], {
  PORT: serverPort,
  CLIENT_ORIGIN: `http://127.0.0.1:${clientPort},http://localhost:${clientPort}`
});
run(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", clientPort], {
  VITE_SERVER_URL: `http://localhost:${serverPort}`
});
