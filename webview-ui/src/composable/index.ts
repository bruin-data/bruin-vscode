export const handleError = (validationError: string | null, renderSQLAssetError: string |null) => {
    if (validationError || renderSQLAssetError) {
      return {
        errorCaptured: true,
        errorMessage: validationError || renderSQLAssetError || "An error occurred",
      };
    }
  }