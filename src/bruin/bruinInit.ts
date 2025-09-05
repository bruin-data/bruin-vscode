import { BruinCommand } from "./bruinCommand";

export class BruinInit extends BruinCommand {
  protected bruinCommand(): string {
    return "init";
  }

  public async initProject(templateName: string, projectPath?: string, inPlace: boolean = false): Promise<string> {
    const args = [templateName];
    
    // Add --in-place flag if requested
    if (inPlace) {
      args.push("--in-place");
    }
    
    // If projectPath is provided, add it as argument
    if (projectPath) {
      args.push(projectPath);
    }
    
    const result = await this.run(args);
    return result;
  }
}