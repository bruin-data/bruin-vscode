import type { CheckboxItems } from "@/types";


const isExclusiveChecked = (checkboxesItems: CheckboxItems[]): boolean => {
  return checkboxesItems.some(item => item.name === 'Exclusive-End-Date' && item.checked);

  }

const adjustEndDateForExclusive = (endtDate: string): string => {
    let endDateObject = new Date(endtDate);
    endDateObject.setUTCHours(23, 59, 59, 999);
  return endDateObject.toISOString().replace(/\.999Z$/, ".999999999Z");
  }
 
  export const concatCommandFlags = (startDate: string, endDate: string, checkboxesItems: CheckboxItems[]): string => {
    const startDateFlag = ' --start-date ' + startDate;
    let endDateFlag = ' --end-date ' + endDate;
  
    // Adjust end date if "Exclusive End Date" is checked
    if (isExclusiveChecked(checkboxesItems)) {
      endDateFlag = ' --end-date ' + adjustEndDateForExclusive(startDate);
    }
  
    const checkboxesFlags = checkboxesItems.filter(item => item.checked && item.name !== 'Exclusive-End-Date')
      .map(item => ` --${item.name.toLowerCase()
      }`);
  
    const flags = [startDateFlag, endDateFlag, ...checkboxesFlags].concat().join(' ');
    return flags;
  };
  
  export const handleError = (validationError: string | null, renderSQLAssetError: string |null) => {
    if (validationError || renderSQLAssetError) {
      return {
        errorCaptured: true,
        errorMessage: validationError || renderSQLAssetError || "An error occurred",
      };
    }
  }

  export const resetStates = (states: any[]) => {
    states.forEach(state => state.value = null);
}

export const updateValue = (envelope: { payload: { status: string; message: any; }; }, status: string) => {
  return envelope.payload.status === status ? envelope.payload.message : null;
};

export const determineValidationStatus = (success: string | null, error: string | null, loading: string | null) =>{
  return success ? "validated" : error ? "failed" : loading ? "loading" : null;
}

