import { BruinInstallCLI } from "../../bruin/bruinInstallCli";

export const installOrUpdateCli = async () => {
  const bruinInstaller = new BruinInstallCLI();
  const isInstalled = await bruinInstaller.checkBruinCliInstallation();
  await bruinInstaller.installOrUpdate(isInstalled.installed);
};
