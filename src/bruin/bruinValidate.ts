import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import * as vscode from "vscode";

// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from "child_process";
import { BruinPanel } from "../panels/BruinPanel";

/** Provides a promise-based API around a Bruin validate. */
export class BruinValidate extends BruinCommand {
  protected bruinCommand(): string {
    return "validate";
  }

  public async validate(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ) {
    await this.run([filePath, ...flags], { ignoresErrors })
      .then((result) => {
        BruinPanel.currentPanel?.postMessage("message", result);
      })
      .catch((err) => {
        BruinPanel.currentPanel?.postMessage("errorMessage", err);
      });
  }
}
