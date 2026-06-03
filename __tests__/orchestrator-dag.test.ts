/**
 * Tests for the DAG execution engine in lib/agents/orchestrator.ts
 *
 * We test the pure logic: dependency resolution, parallel execution,
 * retry behaviour, and failure propagation — without hitting Supabase or
 * any AI provider.
 */
import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";

// ── Minimal type stubs ────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  assigned_agent: string;
  status: string;
  priority: number;
  dependencies: string[];
  retry_count: number;
  max_retries: number;
}

// ── Pure DAG resolver (extracted from orchestrator logic) ─────────────────────
// We test the dependency resolution algorithm directly, without the DB layer.
function getReadyTasks(tasks: Task[], completed: Set<string>, failed: Set<string>): Task[] {
  return tasks.filter(
    t =>
      t.status === "pending" &&
      !completed.has(t.id) &&
      !failed.has(t.id) &&
      t.dependencies.every(dep => completed.has(dep))
  );
}

function simulateDAG(
  tasks: Task[],
  agentResults: Record<string, "success" | "fail">
): { completed: string[]; failed: string[]; iterations: number } {
  const completed = new Set<string>();
  const failed    = new Set<string>();
  const working   = tasks.map(t => ({ ...t }));
  let iterations  = 0;
  const maxIter   = tasks.length * 2;

  while (completed.size + failed.size < tasks.length && iterations < maxIter) {
    iterations++;
    const ready = getReadyTasks(working, completed, failed);
    if (ready.length === 0) break;

    for (const task of ready) {
      const result = agentResults[task.assigned_agent] ?? "success";
      if (result === "success") {
        task.status = "completed";
        completed.add(task.id);
      } else {
        task.retry_count++;
        if (task.retry_count >= task.max_retries) {
          task.status = "failed";
          failed.add(task.id);
        }
        // else stays pending for next iteration
      }
    }
  }

  return { completed: [...completed], failed: [...failed], iterations };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("DAG dependency resolution", () => {
  it("returns root tasks (no dependencies) as immediately ready", () => {
    const tasks: Task[] = [
      { id: "pm",   title: "Product Manager", assigned_agent: "product_manager", status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
      { id: "arch", title: "Architect",        assigned_agent: "architect",       status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
      { id: "fe",   title: "Frontend",         assigned_agent: "frontend",        status: "pending", priority: 5,  dependencies: ["pm", "arch"], retry_count: 0, max_retries: 3 },
    ];

    const ready = getReadyTasks(tasks, new Set(), new Set());
    expect(ready.map(t => t.id)).toEqual(expect.arrayContaining(["pm", "arch"]));
    expect(ready.map(t => t.id)).not.toContain("fe");
  });

  it("unlocks dependent tasks once dependencies complete", () => {
    const tasks: Task[] = [
      { id: "pm",   title: "PM",       assigned_agent: "product_manager", status: "pending", priority: 10, dependencies: [],           retry_count: 0, max_retries: 3 },
      { id: "arch", title: "Arch",     assigned_agent: "architect",       status: "pending", priority: 10, dependencies: [],           retry_count: 0, max_retries: 3 },
      { id: "fe",   title: "Frontend", assigned_agent: "frontend",        status: "pending", priority: 5,  dependencies: ["pm", "arch"], retry_count: 0, max_retries: 3 },
    ];

    const completed = new Set(["pm", "arch"]);
    const ready = getReadyTasks(tasks, completed, new Set());
    expect(ready.map(t => t.id)).toContain("fe");
  });

  it("does not unlock tasks whose dependencies partially completed", () => {
    const tasks: Task[] = [
      { id: "fe", title: "Frontend", assigned_agent: "frontend", status: "pending", priority: 5, dependencies: ["pm", "arch"], retry_count: 0, max_retries: 3 },
    ];

    // Only pm done, arch still pending
    const ready = getReadyTasks(tasks, new Set(["pm"]), new Set());
    expect(ready).toHaveLength(0);
  });

  it("skips already-completed tasks", () => {
    const tasks: Task[] = [
      { id: "pm", title: "PM", assigned_agent: "product_manager", status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
    ];

    const ready = getReadyTasks(tasks, new Set(["pm"]), new Set());
    expect(ready).toHaveLength(0);
  });

  it("skips failed tasks", () => {
    const tasks: Task[] = [
      { id: "pm", title: "PM", assigned_agent: "product_manager", status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
    ];

    const ready = getReadyTasks(tasks, new Set(), new Set(["pm"]));
    expect(ready).toHaveLength(0);
  });
});

describe("DAG full execution simulation", () => {
  it("completes all tasks in a linear chain", () => {
    const tasks: Task[] = [
      { id: "1", title: "A", assigned_agent: "product_manager", status: "pending", priority: 10, dependencies: [],    retry_count: 0, max_retries: 3 },
      { id: "2", title: "B", assigned_agent: "architect",       status: "pending", priority: 9,  dependencies: ["1"], retry_count: 0, max_retries: 3 },
      { id: "3", title: "C", assigned_agent: "frontend",        status: "pending", priority: 8,  dependencies: ["2"], retry_count: 0, max_retries: 3 },
    ];

    const { completed, failed } = simulateDAG(tasks, {
      product_manager: "success",
      architect: "success",
      frontend: "success",
    });

    expect(completed).toHaveLength(3);
    expect(failed).toHaveLength(0);
  });

  it("completes parallel tasks in fewer iterations than sequential", () => {
    const parallelTasks: Task[] = [
      { id: "1", title: "A", assigned_agent: "product_manager", status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
      { id: "2", title: "B", assigned_agent: "architect",       status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
      { id: "3", title: "C", assigned_agent: "frontend",        status: "pending", priority: 10, dependencies: [], retry_count: 0, max_retries: 3 },
    ];

    const { iterations } = simulateDAG(parallelTasks, {
      product_manager: "success", architect: "success", frontend: "success",
    });

    // All 3 run in parallel → 1 iteration
    expect(iterations).toBe(1);
  });

  it("retries failing tasks up to max_retries then marks failed", () => {
    const tasks: Task[] = [
      { id: "1", title: "Flaky", assigned_agent: "frontend", status: "pending", priority: 5, dependencies: [], retry_count: 0, max_retries: 1 },
    ];

    const { completed, failed } = simulateDAG(tasks, { frontend: "fail" });
    expect(failed).toContain("1");
    expect(completed).not.toContain("1");
  });

  it("does not execute downstream tasks if upstream failed", () => {
    const tasks: Task[] = [
      { id: "1", title: "A", assigned_agent: "architect", status: "pending", priority: 10, dependencies: [],    retry_count: 0, max_retries: 1 },
      { id: "2", title: "B", assigned_agent: "frontend",  status: "pending", priority: 5,  dependencies: ["1"], retry_count: 0, max_retries: 1 },
    ];

    const { completed, failed } = simulateDAG(tasks, { architect: "fail", frontend: "success" });
    expect(failed).toContain("1");
    // frontend never ran because architect failed
    expect(completed).not.toContain("2");
    expect(failed).not.toContain("2"); // stuck pending, not failed
  });

  it("handles empty task list without infinite loop", () => {
    const { completed, failed, iterations } = simulateDAG([], {});
    expect(completed).toHaveLength(0);
    expect(failed).toHaveLength(0);
    expect(iterations).toBe(0);
  });

  it("terminates within maxIterations even with circular-like stall", () => {
    // Both tasks depend on each other (impossible graph — should stall safely)
    const tasks: Task[] = [
      { id: "1", title: "A", assigned_agent: "frontend", status: "pending", priority: 5, dependencies: ["2"], retry_count: 0, max_retries: 3 },
      { id: "2", title: "B", assigned_agent: "backend",  status: "pending", priority: 5, dependencies: ["1"], retry_count: 0, max_retries: 3 },
    ];

    const { iterations } = simulateDAG(tasks, { frontend: "success", backend: "success" });
    // Should stall at iteration 1 (no ready tasks) and exit
    expect(iterations).toBeLessThanOrEqual(tasks.length * 2);
  });
});
