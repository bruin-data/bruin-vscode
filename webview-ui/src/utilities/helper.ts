import type { CheckboxItems } from "@/types";


const isExclusiveChecked = (checkboxesItems: CheckboxItems[]): boolean => {
  return checkboxesItems.some(item => item.name === 'Exclusive-End-Date' && item.checked);

  }

  export const adjustEndDateForExclusive = (endDate: string): string => {
    const endDateObject = new Date(endDate);
    endDateObject.setUTCMilliseconds(endDateObject.getMilliseconds() - 1);

    const tzOffset = endDateObject.getTimezoneOffset() * 60000; // Offset in milliseconds
    const adjustedEndDateWithOffset = new Date(endDateObject.getTime() - tzOffset);

    return adjustedEndDateWithOffset.toISOString().replace(/\.999Z$/, ".999999999Z");
  };
  
 
  export const concatCommandFlags = (
    startDate: string,
    endDate: string,
    endDateExclusive: string,
    checkboxItems: CheckboxItems[]
  ): string => {
    let startDateFlag = ' --start-date ' + startDate;
    if (startDateFlag.slice(-1) !== 'Z') {
      startDateFlag += 'Z';
    }
  
    let endDateFlag = ' --end-date ' + endDate;
  
    // Adjust end date if "Exclusive End Date" is checked
    if (isExclusiveChecked(checkboxItems)) {
      endDateFlag = ' --end-date ' + endDateExclusive;
    }
  
    const checkboxesFlags = checkboxItems
      .filter(item => item.checked && item.name !== 'Exclusive-End-Date')
      .map(item => ` --${item.name.toLowerCase()}`);
  
    const flags = [startDateFlag, endDateFlag, ...checkboxesFlags].join(' ');
    return flags;
  };
  
  
  export const handleError = (validationError: any | null, renderSQLAssetError: string |null) => {
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

export function formatLineage(data: string ){
  if(!data) return;

  const parsedData = JSON.parse(data);
  console.log(parsedData);
  const numDownstream = parsedData.downstream?.length || 0;
  const numUpstream = parsedData.upstream?.length || 0;

  let result = `Lineage: '${parsedData.name}'\n\n`;
  result += "Upstream Dependencies\n ========================\n";
  if (numUpstream === 0) {
    result += "Asset has no upstream dependencies.\n\n";
  } else {
    parsedData.upstream.forEach(dep => {
      result += `- ${dep.name} (${dep.executable_file.path.split('/').pop()})\n`;
    });
    result += `\nTotal: ${parsedData.upstream.length}\n\n`;
  }

  result += "Downstream Dependencies\n========================\n";
  if (numDownstream === 0) {
    result += "Asset has no downstream dependencies.\n";
  } else {
    parsedData.downstream.forEach(dep => {
      result += `- ${dep.name} (${dep.executable_file.path.split('/').pop()})\n`;
    });
    result += `\nTotal: ${parsedData.downstream.length}\n`;
  }

  
  return result;
}

export const parseAssetDetails = (data: string) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  const assetDetails = {
    id: parsedData.asset.id,
    name: parsedData.asset.name || "undefined",
    type: parsedData.asset.type || "undefined",
    schedule : parsedData.asset.schedule || "undefined",
    description: parsedData.asset.description || null,
    owner: parsedData.asset.owner || "undefined",
    pipeline: parsedData.pipeline || "undefined",
  };

  return assetDetails;
}

