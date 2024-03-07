import { bruinDelimiterRegex } from "../constants";


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
