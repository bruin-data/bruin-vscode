import * as vscode from "vscode";

/**
 * Gets the path to the Bruin executable specified by the workspace
 * configuration, if present.
 *
 * @returns The path to the Bruin executable specified in the workspace
 * configuration, or just "bruin" if not present (in which case the system path
 * will be searched).
 */
export function getDefaultBruinExecutablePath(): string {
  // Try to retrieve the executable from VS Code's settings. If it's not set,
  // just use "bruin" as the default and get it from the system PATH.
  const bruinConfig = vscode.workspace.getConfiguration("bruin");
  const bruinExecutable = bruinConfig.get<string>("executable") || "";
  if (bruinExecutable.length === 0) {
    return "bruin";
  }
  return bruinExecutable;
}
