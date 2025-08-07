import { BruinCommand } from "./bruinCommand";

interface TemplateListResponse {
  templates: string[];
  count: number;
}

export class BruinInternalListTemplates extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async listTemplates(): Promise<TemplateListResponse> {
    const result = await this.run(["list-templates", "-o", "json"]);
    return JSON.parse(result);
  }
}