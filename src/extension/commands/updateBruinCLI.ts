import { BruinInstallCLI } from "../../bruin/bruinInstallCli";
import { checkBruinCliInstallation } from "../../bruin";

export const installOrUpdateCli = async () => {
  const bruinInstaller = new BruinInstallCLI();
  const isInstalled = await checkBruinCliInstallation();
  await bruinInstaller.installOrUpdate(isInstalled.installed);
};
