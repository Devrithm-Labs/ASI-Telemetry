const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Detect virtual environment Python binary
const winVenv = path.join(__dirname, ".venv", "Scripts", "python.exe");
const unixVenv = path.join(__dirname, ".venv", "bin", "python");

let pythonPath = "python";
if (process.platform === "win32" && fs.existsSync(winVenv)) {
  pythonPath = winVenv;
} else if (fs.existsSync(unixVenv)) {
  pythonPath = unixVenv;
}

const env = { ...process.env, PYTHONPATH: __dirname };

const child = spawn(pythonPath, ["run.py"], {
  cwd: __dirname,
  env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  if (child && !child.killed) child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  if (child && !child.killed) child.kill("SIGTERM");
});
