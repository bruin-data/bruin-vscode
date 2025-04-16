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

export const checkBruinCliVersion = async () => {
  const bruinCLIManager = new BruinInstallCLI();
  const checkCliVersion = bruinCLIManager.checkBruinCLIVersion();
  if (await checkCliVersion) {
    return;
  } else {
    const message = "Your CLI is outdated. Please update it to access all the latest features.";    
    const closeButton = "Close";

    vscode.window.showWarningMessage(message, closeButton).then((selection) => {
      if (selection === closeButton) {
        // Do nothing, just close the message
      }
    });
  }
};
