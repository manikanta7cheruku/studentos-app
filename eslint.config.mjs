import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The service role key ignores Row Level Security. Only small allowed files may use it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/admin/**", "src/**/*.admin.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/admin/*", "**/server/admin/*"],
              message:
                "The service role client may only be imported from src/server/admin/** or a *.admin.ts file.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
