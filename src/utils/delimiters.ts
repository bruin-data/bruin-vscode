type BruinDelimiters = {
    pyStartDelimiter: RegExp;
    pyEndDelimiter: RegExp;
    sqlStartDelimiter: RegExp;
    sqlEndDelimiter: RegExp;
};

const bruinDelimiterRegex : BruinDelimiters = {
    pyStartDelimiter : new RegExp('(\"\"\"\\s*@bruin)\\s*$'),
    pyEndDelimiter : new RegExp('(^\\s*@bruin\\s*\"\"\")'),
    sqlStartDelimiter : new RegExp('(\\/\\*\\s*@bruin)\\s*$'),
    sqlEndDelimiter : new RegExp('(@bruin\\s*\\*\/)$')
};

export const getLangageDelimiters = (languageId: string)  => {
    let startFoldingRegionDelimiter : RegExp = /$^/;
    let endFoldingRegionDelimiter : RegExp = /$^/;

    if(languageId === 'python'){
         startFoldingRegionDelimiter = bruinDelimiterRegex.pyStartDelimiter;
         endFoldingRegionDelimiter = bruinDelimiterRegex.pyEndDelimiter;
    }
    else if(languageId === 'sql'){
        startFoldingRegionDelimiter = bruinDelimiterRegex.sqlStartDelimiter;
        endFoldingRegionDelimiter = bruinDelimiterRegex.sqlEndDelimiter;
    }
    return {
        startFoldingRegionDelimiter, 
        endFoldingRegionDelimiter
        };
};
