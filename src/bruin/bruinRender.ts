import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommand } from "./bruinCommand";
import { BruinCommandOptions } from "../types";
/** Provides a promise-based API around a Bruin render. */
export class BruinRender extends BruinCommand {
  protected bruinCommand(): string {
    return "render";
  }

  public async render(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ) {
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
