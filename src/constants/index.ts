import { BruinDelimiters } from "../types";

const bruinDelimiterRegex: BruinDelimiters = {
  pyStartDelimiter: new RegExp('("""\\s*@bruin)\\s*$'),
  pyEndDelimiter: new RegExp('(^\\s*@bruin\\s*""")'),
  sqlStartDelimiter: new RegExp("(\\/\\*\\s*@bruin)\\s*$"),
  sqlEndDelimiter: new RegExp("(@bruin\\s*\\*/)$"),
};

const BRUIN_WHICH_COMMAND = "which bruin";
const BRUIN_WHERE_COMMAND = "where bruin";
const BRUIN_RENDER_SQL_ID = "bruin.renderSQL";
const BRUIN_RENDER_SQL_COMMAND = "render";
const BRUIN_HELP_COMMAND = "--help";
const BRUIN_HELP_ID = "bruin.help";
const BRUIN_VALIDATE_SQL_COMMAND = "validate";
const BRUIN_VALIDATE_SQL_ID = "bruin.validate";
const BRUIN_RUN_SQL_COMMAND = "run";
const BRUIN_RUN_SQL_ID = "bruin.run";

// Single source of truth for Bruin file extensions
const BRUIN_FILE_EXTENSIONS: string[] = [
  ".sql",
  ".py", 
  ".asset.yml",
  ".asset.yaml",
  ".task.yml",
  ".task.yaml",
  ".pipeline.yml",
  ".pipeline.yaml",
  ".bruin.yml",
  ".bruin.yaml"
];


export {
  bruinDelimiterRegex,
  BRUIN_WHICH_COMMAND,
  BRUIN_RENDER_SQL_ID,
  BRUIN_RENDER_SQL_COMMAND,
  BRUIN_HELP_COMMAND,
  BRUIN_HELP_ID,
  BRUIN_VALIDATE_SQL_COMMAND,
  BRUIN_VALIDATE_SQL_ID,
  BRUIN_RUN_SQL_COMMAND,
  BRUIN_RUN_SQL_ID,
  BRUIN_WHERE_COMMAND,
  BRUIN_FILE_EXTENSIONS,
};
