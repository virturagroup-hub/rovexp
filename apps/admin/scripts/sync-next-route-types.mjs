import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextTypesDir = path.join(root, ".next", "types");
const routesDtsPath = path.join(nextTypesDir, "routes.d.ts");
const routesJsDtsPath = path.join(nextTypesDir, "routes.js.d.ts");

if (fs.existsSync(routesDtsPath) && !fs.existsSync(routesJsDtsPath)) {
  fs.writeFileSync(routesJsDtsPath, 'export type * from "./routes";\n', "utf8");
}
