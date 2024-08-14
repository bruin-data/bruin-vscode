
import * as vscode from "vscode";
import { BruinInstallCLI } from "../../bruin/bruinInstallCli";

export const installOrUpdateCli = async () => {
      const bruinUpgradeOrInstallCli = new BruinInstallCLI();
      await bruinUpgradeOrInstallCli.installOrUpdate();
  };