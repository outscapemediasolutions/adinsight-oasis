import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  serverTimestamp,
  writeBatch,
  where
} from "firebase/firestore";
import { format } from 'date-fns';

export interface AdData {
  uploadId: string;
  date: string;
  campaignName: string;
  adSetName: string;
  objective: string;
  impressions: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  amountSpent: number;
  results: number;
  resultType: string;
  costPerResult: number;
  purchases: number;
  purchasesValue: number;
  roas: number;
  created: any;
  // Added properties to resolve TypeScript errors
  spend: number;
  purchaseConversionValue: number;
  purchaseRoas: number;
  clicks: number;
  cpm: number;
  addsToCart: number; // Added explicit addsToCart field
  conversionRate?: number; // Add conversion rate for charts
}

export interface UploadRecord {
  id: string;
  userId: string;
  fileName: string;
  uploadedAt: number;
  recordCount: number;
  status: string;
  dateRange?: {
    start: string;
    end: string;
  };
  columnMapping?: Record<string, string>;
}

export interface ColumnMappingHistory {
  csvColumn: string;
  mappedTo: string;
  frequency: number;
}

export const validateCSVHeaders = (csvData: string) => {
  const requiredHeaders = [
    "Date",
    "Campaign name",
    "Ad set name",
    "Objective",
    "Impressions",
    "Link clicks",
    "CTR (All)",
    "CPC (cost per link click)",
    "Amount spent (INR)",
    "Results",
    "Result Type",
    "Cost per result",
    "Purchases",
    "Purchases conversion value",
    "Purchase ROAS",
    "Adds to cart" // Added Adds to cart to required headers
  ];
  
  const lines = csvData.trim().split("\n");
  if (lines.length < 2) {
    return { isValid: false, missingHeaders: requiredHeaders, mappedHeaders: [] };
  }
  
  const fileHeaders = lines[0].split(",").map((header) => header.trim());
  const missingHeaders = requiredHeaders.filter(
    (requiredHeader) => !fileHeaders.includes(requiredHeader)
  );
  
  if (missingHeaders.length > 0) {
    return { isValid: false, missingHeaders: missingHeaders, mappedHeaders: [] };
  }
  
  return { isValid: true, missingHeaders: [], mappedHeaders: fileHeaders };
};

export const generateCSVTemplate = () => {
  const headers = [
    "Date",
    "Campaign name",
    "Ad set name",
    "Objective",
    "Impressions",
    "Link clicks",
    "CTR (All)",
    "CPC (cost per link click)",
    "Amount spent (INR)",
    "Results",
    "Result Type",
    "Cost per result",
    "Purchases",
    "Purchases conversion value",
    "Purchase ROAS",
    "Adds to cart" // Added Adds to cart to CSV template
  ];
  return headers.join(",") + "\n";
};

// Get column mapping suggestions based on historical mappings
export const getColumnMappingSuggestions = async (userId: string): Promise<Record<string, string[]>> => {
  try {
    const suggestionsMap: Record<string, string[]> = {};
    
    // Get historical uploads with column mappings
    const uploadsRef = collection(db, 'users', userId, 'upload_history');
    const q = query(uploadsRef, where('columnMapping', '!=', null));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return suggestionsMap;
    }
    
    // Collect all mappings
    const mappingsCount: Record<string, Record<string, number>> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.columnMapping) {
        // Ensure we're using the correct type for columnMapping
        const mapping = data.columnMapping as Record<string, string>;
        Object.entries(mapping).forEach(([requiredCol, mappedCol]) => {
          if (!mappingsCount[requiredCol]) {
            mappingsCount[requiredCol] = {};
          }
          
          if (!mappingsCount[requiredCol][mappedCol]) {
            mappingsCount[requiredCol][mappedCol] = 0;
          }
          
          mappingsCount[requiredCol][mappedCol]++;
        });
      }
    });
    
    // Convert to suggestions sorted by frequency
    Object.entries(mappingsCount).forEach(([requiredCol, mappings]) => {
      suggestionsMap[requiredCol] = Object.entries(mappings)
        .sort((a, b) => b[1] - a[1])
        .map(([col]) => col);
    });
    
    return suggestionsMap;
  } catch (error) {
    console.error("Error getting column mapping suggestions:", error);
    return {};
  }
};

export const getAdData = async (userId: string, filters: any = {}): Promise<AdData[]> => {
  try {
    const adDataRef = collection(db, 'users', userId, 'ad_data');
    let q = query(adDataRef);
    
    // Apply filters
    if (filters.startDate && filters.endDate) {
      console.log(`Filtering data from ${filters.startDate} to ${filters.endDate}`);
      q = query(q, where('date', '>=', filters.startDate), where('date', '<=', filters.endDate));
    }

    if (filters.uploadId) {
      q = query(q, where('uploadId', '==', filters.uploadId));
    }
    
    // Add more filters if needed here
    if (filters.campaignName) {
      q = query(q, where('campaignName', '==', filters.campaignName));
    }
    
    if (filters.adSetName) {
      q = query(q, where('adSetName', '==', filters.adSetName));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No matching documents.");
      return [];
    }
    
    const adData: AdData[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as AdData;
      // Map missing properties from existing ones to ensure compatibility
      data.spend = data.amountSpent;
      data.purchaseConversionValue = data.purchasesValue;
      data.purchaseRoas = data.roas;
      data.clicks = data.linkClicks;
      data.cpm = data.impressions > 0 ? (data.amountSpent / data.impressions) * 1000 : 0;
      // Ensure addsToCart exists (default to 0 if not present)
      data.addsToCart = data.addsToCart || 0;
      
      // Add calculated conversion rate (safely handle division by zero)
      if (data.linkClicks > 0 && data.resultType && data.resultType.trim() !== '') {
        data.conversionRate = (data.results / data.linkClicks) * 100;
      } else {
        data.conversionRate = 0;
      }
      
      // Log data for debugging
      if (adData.length === 0) {
        console.log("Sample data item:", {
          date: data.date,
          campaignName: data.campaignName,
          roas: data.roas,
          spend: data.spend,
          sales: data.purchasesValue,
          clicks: data.clicks,
          impressions: data.impressions,
          results: data.results,
          conversionRate: data.conversionRate
        });
      }
      
      adData.push(data);
    });
    
    console.log(`Retrieved ${adData.length} ad data records`);
    return adData;
  } catch (error) {
    console.error("Error getting ad data:", error);
    throw new Error(`Error getting ad data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const calculateMetrics = (data: AdData[]) => {
  console.log(`Calculating metrics for ${data.length} records`);
  
  let totalSales = 0;
  let totalOrders = 0;
  let totalVisitors = 0;
  let totalSpent = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let addsToCart = 0;
  
  data.forEach(item => {
    totalSales += Number(item.purchasesValue) || 0;
    // Count all results that have a valid result type
    if (item.resultType && item.resultType.trim() !== '') {
      totalOrders += Number(item.results) || 0;
    }
    totalVisitors += Number(item.linkClicks) || 0;
    totalSpent += Number(item.amountSpent) || 0;
    totalImpressions += Number(item.impressions) || 0;
    totalClicks += Number(item.linkClicks) || 0;
    
    // Add to cart tracking - always use the addsToCart field, default to 0 if not available
    addsToCart += Number(item.addsToCart) || 0;
  });
  
  // Safely calculate ratios to avoid division by zero
  const roas = totalSpent > 0 ? totalSales / totalSpent : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
  
  const metrics = {
    totalSales,
    totalOrders,
    totalVisitors,
    totalSpent,
    roas,
    ctr,
    cpc,
    cpm,
    addsToCart,
    conversionRate
  };
  
  console.log("Calculated metrics:", metrics);
  return metrics;
};

export const getCampaignPerformance = (data: AdData[]) => {
  const campaignMap = new Map<string, { 
    impressions: number; 
    clicks: number;
    spend: number;
    sales: number;
    roas: number;
    orders: number;
    conversionRate: number;
  }>();
  
  data.forEach(item => {
    if (!campaignMap.has(item.campaignName)) {
      campaignMap.set(item.campaignName, { 
        impressions: 0, 
        clicks: 0,
        spend: 0,
        sales: 0,
        roas: 0,
        orders: 0,
        conversionRate: 0
      });
    }
    
    const campaignData = campaignMap.get(item.campaignName)!;
    campaignData.impressions += item.impressions;
    campaignData.clicks += item.linkClicks;
    campaignData.spend += item.amountSpent;
    campaignData.sales += item.purchasesValue;
    
    // Count orders only from rows with a valid result type
    if (item.resultType && item.resultType.trim() !== '') {
      campaignData.orders += item.results;
    }
  });
  
  // Calculate derived metrics after summing all raw data
  Array.from(campaignMap.values()).forEach(campaign => {
    // Safely calculate ROAS and conversion rate
    campaign.roas = campaign.spend > 0 ? campaign.sales / campaign.spend : 0;
    campaign.conversionRate = campaign.clicks > 0 ? (campaign.orders / campaign.clicks) * 100 : 0;
  });
  
  return Array.from(campaignMap).map(([campaignName, metrics]) => ({
    campaignName,
    metrics
  }));
};

export const getAdSetPerformance = (data: AdData[]) => {
  const adSetMap = new Map<string, { impressions: number; clicks: number; spend: number; sales: number; roas: number }>();
  
  data.forEach(item => {
    if (!adSetMap.has(item.adSetName)) {
      adSetMap.set(item.adSetName, { 
        impressions: 0, 
        clicks: 0,
        spend: 0,
        sales: 0,
        roas: 0
      });
    }
    
    const adSetData = adSetMap.get(item.adSetName)!;
    adSetData.impressions += item.impressions;
    adSetData.clicks += item.linkClicks;
    adSetData.spend += item.amountSpent;
    adSetData.sales += item.purchasesValue;
    adSetData.roas = adSetData.spend > 0 ? adSetData.sales / adSetData.spend : 0;
  });
  
  return Array.from(adSetMap).map(([adSetName, metrics]) => ({
    adSetName,
    metrics
  }));
};

export const getUniqueCampaigns = (data: AdData[]): string[] => {
  const campaigns = new Set<string>();
  data.forEach(item => {
    campaigns.add(item.campaignName);
  });
  return Array.from(campaigns);
};

export const getUniqueAdSets = (data: AdData[], campaignName?: string): string[] => {
  const adSets = new Set<string>();
  data.forEach(item => {
    if (!campaignName || item.campaignName === campaignName) {
      adSets.add(item.adSetName);
    }
  });
  return Array.from(adSets);
};

export const downloadHistoricalData = async (userId: string, uploadId: string, formatType: "csv" | "json" = "csv") => {
  try {
    const adData = await getAdData(userId, { uploadId });
    
    if (adData.length === 0) {
      console.warn("No data found for upload ID:", uploadId);
      return;
    }
    
    if (formatType === "csv") {
      exportToCSV(adData, `ad_data_${uploadId}`);
    } else if (formatType === "json") {
      exportToJson(adData, `ad_data_${uploadId}`);
    } else {
      throw new Error("Invalid format type. Must be 'csv' or 'json'.");
    }
  } catch (error) {
    console.error("Error downloading historical data:", error);
    throw new Error(`Error downloading historical data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const exportToJson = (data: AdData[], filename: string) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: AdData[], filename: string) => {
  if (data.length === 0) {
    console.warn("No data to export.");
    return;
  }
  
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(item => Object.values(item).join(",")).join("\n");
  const csvContent = headers + "\n" + rows;
  
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const deleteUpload = async (userId: string, uploadId: string): Promise<boolean> => {
  try {
    // Delete ad data associated with the upload
    const adDataRef = collection(db, 'users', userId, 'ad_data');
    const q = query(adDataRef, where('uploadId', '==', uploadId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete upload history record
    const uploadHistoryRef = doc(db, 'users', userId, 'upload_history', uploadId);
    batch.delete(uploadHistoryRef);
    
    await batch.commit();
    
    console.log(`Successfully deleted upload ${uploadId} and associated data`);
    return true;
  } catch (error) {
    console.error("Error deleting upload:", error);
    throw new Error(`Error deleting upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Process and save CSV data to Firestore with column mapping support
 */
export const processAndSaveCSVData = async (
  userId: string, 
  fileName: string, 
  data: Record<string, string>[],
  columnMapping: Record<string, string> | null = null
) => {
  try {
    // Get a batch reference for batch operations
    const batch = writeBatch(db);
    const adDataRef = collection(db, 'users', userId, 'ad_data');
    const timestamp = Date.now();
    
    console.log(`Processing ${data.length} records for user ${userId}`);
    
    // Extract date range
    let minDate = '';
    let maxDate = '';
    
    data.forEach(row => {
      const date = row['Date'];
      if (date) {
        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;
      }
    });
    
    // Create a unique upload ID
    const uploadId = `upload_${timestamp}`;
    
    // Add each row to the batch
    data.forEach((row, index) => {
      const docRef = doc(adDataRef, `${uploadId}_${index}`);
      
      const transformedRow = {
        uploadId,
        date: row['Date'] || '',
        campaignName: row['Campaign name'] || '',
        adSetName: row['Ad set name'] || '',
        objective: row['Objective'] || '',
        impressions: parseFloat(row['Impressions']) || 0,
        linkClicks: parseFloat(row['Link clicks']) || 0,
        ctr: parseFloat(row['CTR (All)']) || 0,
        cpc: parseFloat(row['CPC (cost per link click)']) || 0,
        amountSpent: parseFloat(row['Amount spent (INR)']) || 0,
        results: parseFloat(row['Results']) || 0,
        resultType: row['Result Type'] || '',
        costPerResult: parseFloat(row['Cost per result']) || 0,
        purchases: parseFloat(row['Purchases']) || 0,
        purchasesValue: parseFloat(row['Purchases conversion value']) || 0,
        roas: parseFloat(row['Purchase ROAS']) || 0,
        addsToCart: parseFloat(row['Adds to cart']) || 0, // Added addsToCart
        created: serverTimestamp()
      };
      
      batch.set(docRef, transformedRow);
    });
    
    // Prepare upload history document data with safe handling of columnMapping
    const uploadHistoryData = {
      id: uploadId,
      userId,
      fileName,
      uploadedAt: timestamp,
      recordCount: data.length,
      status: 'completed',
      dateRange: {
        start: minDate,
        end: maxDate
      },
      // Ensure columnMapping is never undefined
      columnMapping: columnMapping || null,
      created: serverTimestamp()
    };
    
    // Save upload info to upload_history collection with validated column mapping
    const uploadHistoryRef = doc(collection(db, 'users', userId, 'upload_history'), uploadId);
    batch.set(uploadHistoryRef, uploadHistoryData);
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully saved ${data.length} records and upload history`);
    
    return { success: true, uploadId };
  } catch (error) {
    console.error("Error saving CSV data:", error);
    throw new Error(`Error saving CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get user upload history
 */
export const getUserUploads = async (userId: string): Promise<UploadRecord[]> => {
  try {
    const uploadsRef = collection(db, 'users', userId, 'upload_history');
    const q = query(
      uploadsRef,
      orderBy('uploadedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No upload history found for user");
      return [];
    }
    
    const uploads: UploadRecord[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      uploads.push({
        id: doc.id,
        userId: data.userId,
        fileName: data.fileName,
        uploadedAt: data.uploadedAt,
        recordCount: data.recordCount,
        status: data.status,
        dateRange: data.dateRange,
        columnMapping: data.columnMapping
      });
    });
    
    console.log(`Found ${uploads.length} upload records`);
    return uploads;
  } catch (error) {
    console.error("Error fetching upload history:", error);
    throw new Error(`Error fetching upload history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// New helper function to group data by date for trend charts
export const groupByDate = (data: AdData[]) => {
  console.log(`Grouping ${data.length} records by date`);
  
  const dateMap = new Map<string, {
    date: string;
    impressions: number;
    clicks: number;
    spent: number;
    sales: number;
    roas: number;
    orders: number;
    ctr: number;
    conversionRate: number;
    cpc: number;
    costPerResult: number;
  }>();
  
  // Sort data by date first
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  
  sortedData.forEach(item => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, {
        date: item.date,
        impressions: 0,
        clicks: 0,
        spent: 0,
        sales: 0,
        roas: 0,
        orders: 0,
        ctr: 0,
        conversionRate: 0,
        cpc: 0,
        costPerResult: 0
      });
    }
    
    const dateData = dateMap.get(item.date)!;
    dateData.impressions += Number(item.impressions) || 0;
    dateData.clicks += Number(item.linkClicks) || 0;
    dateData.spent += Number(item.amountSpent) || 0;
    dateData.sales += Number(item.purchasesValue) || 0;
    dateData.cpc = Number(item.cpc) || 0;
    dateData.costPerResult = Number(item.costPerResult) || 0;
    
    // Count orders only from rows with a valid result type
    if (item.resultType && item.resultType.trim() !== '') {
      dateData.orders += Number(item.results) || 0;
    }
  });
  
  // Calculate derived metrics after summing all raw data for each date
  const result = Array.from(dateMap.values()).map(day => {
    // Safely calculate metrics to avoid division by zero
    const roas = day.spent > 0 ? day.sales / day.spent : 0;
    const ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
    const conversionRate = day.clicks > 0 ? (day.orders / day.clicks) * 100 : 0;
    const cpc = day.clicks > 0 ? day.spent / day.clicks : 0;
    const costPerResult = day.orders > 0 ? day.spent / day.orders : 0;
    
    return {
      ...day,
      roas,
      ctr,
      conversionRate,
      cpc,
      costPerResult
    };
  });
  
  console.log(`Grouped ${data.length} records into ${result.length} dates`);
  
  // Log first date record for debugging
  if (result.length > 0) {
    console.log("Sample grouped date:", result[0]);
  }
  
  return result;
};
