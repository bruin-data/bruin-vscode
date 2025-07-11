import { BruinCommand } from "./bruinCommand";

export class BruinEnvironments extends BruinCommand {
  protected bruinCommand(): string {
    return "environments";
  }

  public async create(environment: string): Promise<string> {
    const flags = ["create", "--name", environment, "-o", "json"];
    return this.run(flags);
  }
}

