import { describe, it, expect, vi } from "vitest";
import { createValidator } from "../validator.ts";
import type { LanguagePlugin } from "../plugins/types.ts";

function makePlugin(
  diagnostics: { line: number; col: number; severity: "error" | "warning"; message: string }[],
): LanguagePlugin {
  return {
    name: "test",
    extensions: [".test"],
    onValidate: () => diagnostics,
  };
}

describe("Validator", () => {
  it("starts with empty diagnostics", () => {
    const v = createValidator(null);
    expect(v.state.diagnostics).toEqual([]);
  });

  it("does nothing without onValidate", () => {
    const plugin: LanguagePlugin = { name: "test", extensions: [".test"] };
    const v = createValidator(plugin);
    v.schedule(["hello"]);
    expect(v.state.diagnostics).toEqual([]);
  });

  it("runs validation after debounce", async () => {
    const diags = [{ line: 0, col: 0, severity: "error" as const, message: "bad" }];
    const v = createValidator(makePlugin(diags));

    v.schedule(["hello"]);
    expect(v.state.diagnostics).toEqual([]); // not yet

    await new Promise((r) => setTimeout(r, 600));
    expect(v.state.diagnostics).toEqual(diags);
  });

  it("skips if content unchanged", async () => {
    let callCount = 0;
    const plugin: LanguagePlugin = {
      name: "test",
      extensions: [".test"],
      onValidate: () => {
        callCount++;
        return [];
      },
    };
    const v = createValidator(plugin);

    v.schedule(["hello"]);
    v.schedule(["hello"]); // same content
    await new Promise((r) => setTimeout(r, 600));
    expect(callCount).toBe(1);
  });

  it("revalidates on content change", async () => {
    let callCount = 0;
    const plugin: LanguagePlugin = {
      name: "test",
      extensions: [".test"],
      onValidate: () => {
        callCount++;
        return [];
      },
    };
    const v = createValidator(plugin);

    v.schedule(["hello"]);
    await new Promise((r) => setTimeout(r, 600));
    v.schedule(["world"]);
    await new Promise((r) => setTimeout(r, 600));
    expect(callCount).toBe(2);
  });

  it("clear resets diagnostics and allows revalidation", async () => {
    const diags = [{ line: 0, col: 0, severity: "error" as const, message: "bad" }];
    const v = createValidator(makePlugin(diags));

    v.schedule(["hello"]);
    await new Promise((r) => setTimeout(r, 600));
    expect(v.state.diagnostics.length).toBe(1);

    v.clear();
    expect(v.state.diagnostics).toEqual([]);

    // same content should revalidate after clear
    v.schedule(["hello"]);
    await new Promise((r) => setTimeout(r, 600));
    expect(v.state.diagnostics.length).toBe(1);
  });

  it("calls onDone callback after validation", async () => {
    const onDone = vi.fn();
    const v = createValidator(makePlugin([]), onDone);

    v.schedule(["hello"]);
    await new Promise((r) => setTimeout(r, 600));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("debounces rapid changes", async () => {
    let callCount = 0;
    const plugin: LanguagePlugin = {
      name: "test",
      extensions: [".test"],
      onValidate: () => {
        callCount++;
        return [];
      },
    };
    const v = createValidator(plugin);

    v.schedule(["a"]);
    v.schedule(["ab"]);
    v.schedule(["abc"]);
    await new Promise((r) => setTimeout(r, 600));
    // only last one should have run
    expect(callCount).toBe(1);
  });
});
