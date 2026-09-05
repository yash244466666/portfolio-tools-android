import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const variant = process.argv[2] ?? "debug"
const taskVariant = variant[0].toUpperCase() + variant.slice(1)
const manifestPath = resolve(
  `android/app/build/intermediates/merged_manifest/${variant}/process${taskVariant}MainManifest/AndroidManifest.xml`,
)
const manifest = readFileSync(manifestPath, "utf8")

const allowedPermissions = new Set([
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.INTERNET",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.VIBRATE",
  "android.permission.WAKE_LOCK",
])

const deniedPermissions = [
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.CAMERA",
  "android.permission.MANAGE_EXTERNAL_STORAGE",
  "android.permission.QUERY_ALL_PACKAGES",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.RECORD_AUDIO",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.SEND_SMS",
  "android.permission.USE_EXACT_ALARM",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "com.google.android.gms.permission.AD_ID",
]

const permissionNames = [...manifest.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)].map(
  (match) => match[1],
)
const unexpectedPermissions = permissionNames.filter(
  (permission) =>
    !allowedPermissions.has(permission) &&
    !/^dev\.yash\.tools(?:\.(?:debug|internal))?\.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION$/.test(
      permission,
    ),
)
const presentDeniedPermissions = deniedPermissions.filter((permission) =>
  permissionNames.includes(permission),
)

const exportedComponents = [
  ...manifest.matchAll(
    /<(activity|activity-alias|provider|receiver|service)\b[^>]*android:name="([^"]+)"[^>]*android:exported="true"[^>]*>/g,
  ),
].map((match) => `${match[1]}:${match[2]}`)
const unexpectedExports = exportedComponents.filter(
  (component) => component !== "activity:dev.yash.tools.MainActivity",
)

const configurationFailures = []
if (!/android:allowBackup="false"/.test(manifest)) {
  configurationFailures.push("android:allowBackup must be false")
}
if (!/android:usesCleartextTraffic="false"/.test(manifest)) {
  configurationFailures.push("android:usesCleartextTraffic must be false")
}

const failures = [
  ...presentDeniedPermissions.map((permission) => `denied permission: ${permission}`),
  ...unexpectedPermissions.map((permission) => `unreviewed permission: ${permission}`),
  ...unexpectedExports.map((component) => `unexpected exported component: ${component}`),
  ...configurationFailures,
]

if (failures.length > 0) {
  console.error(`Android ${variant} merged-manifest check failed:`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Android ${variant} merged-manifest check passed.`)
  console.log(`Reviewed permissions (${permissionNames.length}): ${permissionNames.join(", ")}`)
  console.log(`Exported components: ${exportedComponents.join(", ")}`)
}
