import { BruinDelimiters } from "../types";

const bruinDelimiterRegex : BruinDelimiters = {
    pyStartDelimiter : new RegExp('(\"\"\"\\s*@bruin)\\s*$'),
    pyEndDelimiter : new RegExp('(^\\s*@bruin\\s*\"\"\")'),
    sqlStartDelimiter : new RegExp('(\\/\\*\\s*@bruin)\\s*$'),
    sqlEndDelimiter : new RegExp('(@bruin\\s*\\*\/)$')
};

const BRUIN_WHICH_COMMAND= 'which bruin';
const BRUIN_RENDER_SQL_ID = 'bruin.renderSQL';
const BRUIN_RENDER_SQL_COMMAND = 'bruin render';
const BRUIN_HELP_COMMAND = 'bruin --help';
const BRUIN_HELP_ID = 'bruin.help';


export { 
    bruinDelimiterRegex, 
    BRUIN_WHICH_COMMAND, 
    BRUIN_RENDER_SQL_ID, 
    BRUIN_RENDER_SQL_COMMAND, 
    BRUIN_HELP_COMMAND, 
    BRUIN_HELP_ID 
};