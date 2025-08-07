import { BruinCommand } from "./bruinCommand";

export class BruinInit extends BruinCommand {
  protected bruinCommand(): string {
    return "init";
  }

  public async initProject(templateName: string, projectPath?: string): Promise<string> {
    const args = [templateName];
    
    // If projectPath is provided, add it as argument
    if (projectPath) {
      args.push(projectPath);
    }
    
    const result = await this.run(args);
    return result;
  }
}