import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const repositoryRoot = resolve(import.meta.dirname, "..")
const gradle = resolve(repositoryRoot, "android/gradlew")
const targetPackage = "dev.yash.tools.debug"
const testPackage = "dev.yash.tools.debug.test"
const runner = "androidx.test.runner.AndroidJUnitRunner"
const testClass = "dev.yash.tools.ProcessRecreationInstrumentedTest"

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{ allowFailure?: boolean; label?: string }} [options]
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${options.label ?? command} failed with exit ${result.status ?? "unknown"}.`)
  }
  return result
}

function runPhase(method, phase) {
  const result = run(
    "adb",
    [
      "shell",
      "am",
      "instrument",
      "-w",
      "-r",
      "-e",
      "class",
      `${testClass}#${method}`,
      "-e",
      "processRecreationPhase",
      phase,
      `${testPackage}/${runner}`,
    ],
    { label: `process-recreation ${phase} phase` },
  )
  if (!/OK \(1 test\)/.test(result.stdout)) {
    throw new Error(`Process-recreation ${phase} phase did not report one passing test.`)
  }
}

run(gradle, ["-p", "android", ":app:installDebug", ":app:installDebugAndroidTest"])

try {
  runPhase("prepareDurableAndSensitiveState", "prepare")
  run("adb", ["shell", "am", "force-stop", targetPackage], {
    label: "target process termination",
  })
  runPhase("verifyFreshProcessRestoresOnlyDurableState", "verify")
  console.log("Process-recreation boundary passed across two instrumentation processes.")
} finally {
  run(gradle, ["-p", "android", ":app:uninstallDebugAndroidTest", ":app:uninstallDebug"], {
    allowFailure: true,
  })
}
