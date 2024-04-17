import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommand } from "./bruinCommand";
import { BruinCommandOptions } from "../types";
import { isPythonBruinAsset } from "../utilities/helperUtils";

/** Provides a promise-based API around a Bruin render. */
export class BruinRender extends BruinCommand {
  protected bruinCommand(): string {
    return "render";
  }

  public async render(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ) {
    if (await isPythonBruinAsset(filePath)) {
      BruinPanel.currentPanel?.postMessage(
        "render-alert",
        "-- This is a Python Bruin asset and does not contain SQL code for rendering, but you can still execute the asset."
      );
      return;
    }
    await this.run([filePath, ...flags], { ignoresErrors }).then(
      (sqlRendered) => {
        BruinPanel.currentPanel?.postMessage("render-success", sqlRendered);
      },
      (error) => {
        console.debug(error);
        BruinPanel.currentPanel?.postMessage("render-error", error);
      }
    );
  }
}
