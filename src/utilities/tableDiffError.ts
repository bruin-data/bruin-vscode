// `bruin data-diff -o json` reports failures as a JSON object `{"error": "..."}`
// written to stdout (not stderr), so a non-zero exit surfaces the whole JSON blob
// as the error string. Pull out the human-readable message when it's there.
export function extractTableDiffError(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.error === "string" && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    // Not JSON — leave the caller's original text untouched.
  }
  return null;
}
