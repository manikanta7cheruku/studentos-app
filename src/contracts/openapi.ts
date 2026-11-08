import { z, type ZodType } from "zod";
import { endpoints, type Endpoint } from "./registry";

// Builds docs/openapi.v1.json from the registry and the Zod contracts. Nothing here is written by hand, so the
// document cannot disagree with the code. To refresh the file after a contract change: pnpm docs:openapi.
type Json = Record<string, unknown>;

function schemaOf(schema: ZodType, io: "input" | "output"): Json {
  const json = z.toJSONSchema(schema, { io, unrepresentable: "any" }) as Json;
  delete json.$schema;
  return json;
}

function queryParameters(schema: ZodType): Json[] {
  const json = schemaOf(schema, "input") as {
    properties?: Record<string, Json>;
    required?: string[];
  };
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, value]) => ({
    name,
    in: "query",
    required: required.has(name),
    schema: value,
  }));
}

const errorResponse = (description: string): Json => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

function operation(endpoint: Endpoint): Json {
  const pathVars = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
  const parameters: Json[] = pathVars.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string", ...(name === "slug" ? {} : { format: "uuid" }) },
  }));
  if (endpoint.query) parameters.push(...queryParameters(endpoint.query));
  if (endpoint.idem) {
    parameters.push({
      name: "Idempotency-Key",
      in: "header",
      required: true,
      description: "A new UUID for each user action. Reuse it only to retry the same action.",
      schema: { type: "string", format: "uuid" },
    });
  }

  const responses: Json = {
    [String(endpoint.status ?? 200)]: endpoint.response
      ? {
          description: "Success",
          content: { "application/json": { schema: schemaOf(endpoint.response, "output") } },
        }
      : { description: "Success" },
  };
  if (endpoint.body || endpoint.query || endpoint.idem) {
    responses["400"] = errorResponse("VALIDATION_FAILED");
  }
  if (endpoint.who !== "pub") responses["401"] = errorResponse("UNAUTHENTICATED");
  if (["mem", "mod", "adm"].includes(endpoint.who)) {
    responses["403"] = errorResponse("FORBIDDEN or MEMBERSHIP_NOT_ACTIVE");
  }
  if (pathVars.length > 0) responses["404"] = errorResponse("NOT_FOUND (also for another college)");
  if (endpoint.idem) {
    responses["409"] = errorResponse(
      "CONFLICT (also while the same Idempotency-Key is still running)",
    );
    responses["422"] = errorResponse("IDEMPOTENCY_KEY_REUSED");
  }
  responses["429"] = errorResponse("RATE_LIMITED (read Retry-After)");

  const security =
    endpoint.who === "pub"
      ? []
      : endpoint.who === "cron"
        ? [{ cronSecret: [] }]
        : [{ session: [] }];

  return {
    operationId: `${endpoint.id}_${endpoint.method.toLowerCase()}`,
    tags: [endpoint.id.split("-")[0]],
    summary: `${endpoint.id}: ${endpoint.summary}`,
    "x-who": endpoint.who,
    security,
    parameters,
    ...(endpoint.body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: schemaOf(endpoint.body, "input") } },
          },
        }
      : {}),
    responses,
  };
}

export function buildOpenApi(): Json {
  const paths: Record<string, Json> = {};
  for (const endpoint of endpoints) {
    // Paths outside /api/v1 (health, ready, internal) are written with their full /api prefix.
    const key = endpoint.path.startsWith("/api/") ? `/..${endpoint.path.slice(4)}` : endpoint.path;
    (paths[key] ??= {})[endpoint.method.toLowerCase()] = operation(endpoint);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "StudentOS API",
      version: "1.0.0",
      description:
        "Generated from src/contracts (Zod) and src/contracts/registry.ts. Do not edit by hand: run pnpm docs:openapi. Rules per endpoint: docs/API_CONTRACT.md. Who may call what: docs/PERMISSIONS.md.",
    },
    servers: [{ url: "http://localhost:3000/api/v1" }],
    components: {
      securitySchemes: {
        session: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description: "Set by AUTH-02. The browser keeps the cookies.",
        },
        cronSecret: {
          type: "http",
          scheme: "bearer",
          description: "CRON_SECRET, for the scheduler only",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "request_id"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "object", additionalProperties: true },
                request_id: { type: "string" },
              },
            },
          },
        },
      },
    },
    paths,
  };
}
