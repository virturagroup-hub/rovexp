import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextTypesDir = path.join(root, ".next", "types");
const routesDtsPath = path.join(nextTypesDir, "routes.d.ts");
const routesJsDtsPath = path.join(nextTypesDir, "routes.js.d.ts");

if (!fs.existsSync(nextTypesDir)) {
  fs.mkdirSync(nextTypesDir, { recursive: true });
}

if (!fs.existsSync(routesJsDtsPath)) {
  fs.writeFileSync(routesJsDtsPath, 'export type * from "./routes";\n', "utf8");
}

if (!fs.existsSync(routesDtsPath)) {
  console.warn(
    "[sync-next-route-types] routes.d.ts is missing. Run a Next build once to regenerate route types.",
  );
}
