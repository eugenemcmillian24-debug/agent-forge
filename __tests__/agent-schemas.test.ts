/**
 * Tests for agent output Zod schemas.
 *
 * The schemas are the contract between the AI provider output and the
 * database write. If they drift, files stop being written.
 * We test that valid outputs pass and invalid ones are caught.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Inline the schemas (same as in the agent files) ──────────────────────────
const FileSchema = z.object({
  path:        z.string().min(1),
  content:     z.string().min(10),
  language:    z.string().default("tsx"),
  description: z.string().optional(),
});

const FrontendOutputSchema = z.object({
  files:        z.array(FileSchema),
  dependencies: z.array(z.string()).optional().default([]),
  notes:        z.string().optional(),
});

const BackendOutputSchema = z.object({
  files:    z.array(FileSchema),
  env_vars: z.array(z.object({
    key:         z.string(),
    description: z.string(),
    required:    z.boolean(),
  })).optional().default([]),
  notes: z.string().optional(),
});

const QAReportSchema = z.object({
  passed:        z.boolean(),
  checks:        z.array(z.object({
    name:    z.string(),
    status:  z.enum(["pass", "fail", "warning", "skip"]),
    message: z.string().optional(),
    file:    z.string().optional(),
    line:    z.number().optional(),
  })),
  errors:        z.array(z.string()),
  warnings:      z.array(z.string()),
  repair_needed: z.boolean(),
  repair_tasks:  z.array(z.object({ file: z.string(), issue: z.string(), context: z.string() })),
});

const RepairOutputSchema = z.object({
  fixed_files: z.array(z.object({
    path:    z.string(),
    content: z.string(),
    changes: z.array(z.string()),
  })),
  unresolved: z.array(z.object({
    file:   z.string(),
    issue:  z.string(),
    reason: z.string(),
  })),
  notes: z.string().optional(),
});

const DatabaseOutputSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    columns: z.array(z.object({ name: z.string(), type: z.string(), constraints: z.string() })),
    rls_policies: z.array(z.object({ name: z.string(), operation: z.string(), definition: z.string() })),
  })),
  migration_sql: z.string(),
  seed_sql:      z.string().optional(),
  indexes:       z.array(z.string()),
  notes:         z.string().optional(),
});

// ── Frontend schema ───────────────────────────────────────────────────────────
describe("FrontendOutputSchema", () => {
  it("accepts a valid frontend output", () => {
    const result = FrontendOutputSchema.safeParse({
      files: [{
        path: "app/page.tsx",
        content: 'export default function Page() { return <div>Hello</div>; }',
        language: "tsx",
      }],
      dependencies: ["@radix-ui/react-dialog"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects files with empty path", () => {
    const result = FrontendOutputSchema.safeParse({
      files: [{ path: "", content: "some content here", language: "tsx" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects files with content shorter than 10 chars", () => {
    const result = FrontendOutputSchema.safeParse({
      files: [{ path: "app/page.tsx", content: "short", language: "tsx" }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults dependencies to empty array when omitted", () => {
    const result = FrontendOutputSchema.safeParse({
      files: [{ path: "app/page.tsx", content: "export default function Page() {}", language: "tsx" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dependencies).toEqual([]);
  });

  it("accepts output with no files (empty generation)", () => {
    const result = FrontendOutputSchema.safeParse({ files: [] });
    expect(result.success).toBe(true);
  });
});

// ── QA schema ─────────────────────────────────────────────────────────────────
describe("QAReportSchema", () => {
  it("accepts a passing QA report", () => {
    const result = QAReportSchema.safeParse({
      passed: true,
      checks: [{ name: "TypeScript types", status: "pass" }],
      errors: [],
      warnings: [],
      repair_needed: false,
      repair_tasks: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a failing QA report with repair tasks", () => {
    const result = QAReportSchema.safeParse({
      passed: false,
      checks: [{ name: "Missing import", status: "fail", file: "app/page.tsx", line: 3 }],
      errors: ["Missing import: useRouter"],
      warnings: [],
      repair_needed: true,
      repair_tasks: [{ file: "app/page.tsx", issue: "Missing import", context: "line 3" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.repair_needed).toBe(true);
  });

  it("rejects invalid check status values", () => {
    const result = QAReportSchema.safeParse({
      passed: false,
      checks: [{ name: "test", status: "invalid_status" }],
      errors: [],
      warnings: [],
      repair_needed: false,
      repair_tasks: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires repair_needed to be boolean", () => {
    const result = QAReportSchema.safeParse({
      passed: false,
      checks: [],
      errors: [],
      warnings: [],
      repair_needed: "yes", // wrong type
      repair_tasks: [],
    });
    expect(result.success).toBe(false);
  });
});

// ── Repair schema ─────────────────────────────────────────────────────────────
describe("RepairOutputSchema", () => {
  it("accepts valid repair output", () => {
    const result = RepairOutputSchema.safeParse({
      fixed_files: [{
        path: "app/page.tsx",
        content: 'import { useRouter } from "next/navigation";\nexport default function Page() {}',
        changes: ["Added missing useRouter import"],
      }],
      unresolved: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts repair output with unresolved issues", () => {
    const result = RepairOutputSchema.safeParse({
      fixed_files: [],
      unresolved: [{
        file: "app/layout.tsx",
        issue: "Circular import",
        reason: "Cannot resolve without refactoring — requires manual intervention",
      }],
    });
    expect(result.success).toBe(true);
  });

  it("requires changes array on each fixed file", () => {
    const result = RepairOutputSchema.safeParse({
      fixed_files: [{ path: "app/page.tsx", content: "export default function Page() {}" }],
      unresolved: [],
    });
    expect(result.success).toBe(false);
  });
});

// ── Database schema ───────────────────────────────────────────────────────────
describe("DatabaseOutputSchema", () => {
  it("accepts valid database output", () => {
    const result = DatabaseOutputSchema.safeParse({
      tables: [{
        name: "users",
        columns: [{ name: "id", type: "UUID", constraints: "PRIMARY KEY DEFAULT gen_random_uuid()" }],
        rls_policies: [{ name: "users_own", operation: "ALL", definition: "auth.uid() = id" }],
      }],
      migration_sql: "CREATE TABLE IF NOT EXISTS public.users (id UUID PRIMARY KEY);",
      indexes: ["CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);"],
    });
    expect(result.success).toBe(true);
  });

  it("requires migration_sql to be present", () => {
    const result = DatabaseOutputSchema.safeParse({
      tables: [],
      indexes: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional seed_sql", () => {
    const result = DatabaseOutputSchema.safeParse({
      tables: [],
      migration_sql: "-- empty",
      indexes: [],
      seed_sql: "INSERT INTO public.users VALUES ('00000000-0000-0000-0000-000000000001', 'test@test.com');",
    });
    expect(result.success).toBe(true);
  });
});

// ── File content minimum length guard ─────────────────────────────────────────
describe("File content minimum length guard", () => {
  const stubs = [
    "export {}",      // 9 chars — under limit
    "// TODO",        // 7 chars
    "",               // empty
    "placeholder",    // 11 chars — over limit, should pass
  ];

  it("rejects stub content under 10 chars", () => {
    for (const stub of stubs.slice(0, 3)) {
      const result = FileSchema.safeParse({ path: "app/page.tsx", content: stub, language: "tsx" });
      expect(result.success).toBe(false);
    }
  });

  it("accepts content 10 chars or longer", () => {
    const result = FileSchema.safeParse({ path: "app/page.tsx", content: "placeholder", language: "tsx" });
    expect(result.success).toBe(true);
  });
});
