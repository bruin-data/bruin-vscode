import path = require("path");
import Mocha = require("mocha");
import { glob } from "glob";

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: 20000,
  });

  // __dirname points to out/test/suite at runtime; go up one to out/test
  const testsRoot = path.resolve(__dirname, "..");

  return new Promise((resolve, reject) => {
    glob("**/*.test.js", { cwd: testsRoot })
      .then((files) => {
        try {
          for (const file of files) {
            mocha.addFile(path.resolve(testsRoot, file));
          }
          mocha.run((failures) => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed`));
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      })
      .catch((err) => reject(err));
  });
}
