"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatCommandFlags = void 0;
const isExclusiveChecked = (checkboxesItems) => {
    return checkboxesItems.some(item => item.name === 'Exclusive-End-Date' && item.checked);
};
const adjustEndDateForExclusive = (endtDate) => {
    let endDateObject = new Date(endtDate);
    endDateObject.setUTCHours(23, 59, 59, 999);
    return endDateObject.toISOString().replace(/\.999Z$/, ".999999999Z");
};
const concatCommandFlags = (startDate, endDate, checkboxesItems) => {
    const startDateFlag = ' --start-date ' + startDate;
    let endDateFlag = ' --end-date ' + endDate;
    // Adjust end date if "Exclusive End Date" is checked
    if (isExclusiveChecked(checkboxesItems)) {
        endDateFlag = ' --end-date ' + adjustEndDateForExclusive(startDate);
    }
    const checkboxesFlags = checkboxesItems.filter(item => item.checked && item.name !== 'Exclusive-End-Date')
        .map(item => ` --${item.name.toLowerCase()}`);
    const flags = [startDateFlag, endDateFlag, ...checkboxesFlags];
    return flags.join(" ");
};
exports.concatCommandFlags = concatCommandFlags;
//# sourceMappingURL=helper.js.map