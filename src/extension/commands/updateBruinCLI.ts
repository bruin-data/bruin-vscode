import { BruinInstallCLI } from "../../bruin/bruinInstallCli";
import * as vscode from "vscode";

export const installOrUpdateCli = async () => {
  const bruinInstaller = new BruinInstallCLI();
  const isInstalled = await bruinInstaller.checkBruinCliInstallation();
  if (isInstalled.installed) {
    await bruinInstaller.updateBruinCli();
  } else {
    await bruinInstaller.installBruinCli();
  }
};
