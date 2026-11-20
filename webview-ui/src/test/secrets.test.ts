import { describe, test, expect } from "vitest";
import { toSecretsPatch } from "../utilities/secrets";

describe("toSecretsPatch", () => {
  test("handles missing input", () => {
    expect(toSecretsPatch(undefined)).toEqual([]);
    expect(toSecretsPatch(null)).toEqual([]);
  });

  test("drops secrets without a key", () => {
    expect(toSecretsPatch([{ secret_key: "" }, { secret_key: "  " }, {}])).toEqual([]);
  });

  test("defaults injected_key to the secret key", () => {
    expect(toSecretsPatch([{ secret_key: "foo" }])).toEqual([
      { secret_key: "foo", injected_key: "foo" },
    ]);
    expect(toSecretsPatch([{ secret_key: "foo", injected_key: "  " }])).toEqual([
      { secret_key: "foo", injected_key: "foo" },
    ]);
  });

  test("keeps a custom injected_key", () => {
    expect(toSecretsPatch([{ secret_key: " foo ", injected_key: " FOO_CREDS " }])).toEqual([
      { secret_key: "foo", injected_key: "FOO_CREDS" },
    ]);
  });
});
