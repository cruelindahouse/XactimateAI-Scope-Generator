// FEATURE REMOVED
// Direct ESX/XML export has been deprecated in favor of the AI Analysis Assistant workflow.
// This file is kept as a placeholder to prevent build errors from dangling imports until fully cleaned.

export const exportToXactimateXML = (data: any): string => {
  console.warn("XML Export is deprecated.");
  return "";
};

export const generateESXFile = async (xmlContent: string): Promise<Blob> => {
  console.warn("ESX Generation is deprecated.");
  return new Blob([]);
};