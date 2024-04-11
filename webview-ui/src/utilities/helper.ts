import type { CheckboxItems } from "@/types";

export const concatCommandFlags = ((startDate: string, endDate: string, checkboxesItems: CheckboxItems[]): string => {
    const startDateFlag = ' -start-date ' + startDate;
    const endDateFlag = ' -end-date ' + endDate;
    const checkboxesFlags = checkboxesItems.map((item) => item.checked ? ' --' + item.name.toLocaleLowerCase() : '');
    const flags = [startDateFlag, endDateFlag, ...checkboxesFlags];
    return flags.join(" ");
  });
  