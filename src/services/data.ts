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
  // Added missing properties to resolve TypeScript errors
  spend: number;
  purchaseConversionValue: number;
  purchaseRoas: number;
  clicks: number;
  cpm: number;
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
  ];
  return headers.join(",") + "\n";
};

export const getAdData = async (userId: string, filters: any = {}): Promise<AdData[]> => {
  try {
    const adDataRef = collection(db, 'users', userId, 'ad_data');
    let q = query(adDataRef);
    
    // Apply filters
    if (filters.startDate && filters.endDate) {
      q = query(q, where('date', '>=', filters.startDate), where('date', '<=', filters.endDate));
    }

    if (filters.uploadId) {
      q = query(q, where('uploadId', '==', filters.uploadId));
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
      data.cpm = (data.amountSpent / data.impressions) * 1000 || 0;
      
      adData.push(data);
    });
    
    return adData;
  } catch (error) {
    console.error("Error getting ad data:", error);
    throw new Error(`Error getting ad data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const calculateMetrics = (data: AdData[]) => {
  let totalSales = 0;
  let totalOrders = 0;
  let totalVisitors = 0;
  let totalSpent = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  
  data.forEach(item => {
    totalSales += item.purchasesValue;
    totalOrders += item.purchases;
    totalVisitors += item.linkClicks;
    totalSpent += item.amountSpent;
    totalImpressions += item.impressions;
    totalClicks += item.linkClicks;
  });
  
  const roas = totalSpent > 0 ? totalSales / totalSpent : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
  
  return {
    totalSales,
    totalOrders,
    totalVisitors,
    roas,
    ctr,
    cpc,
    cpm
  };
};

export const getCampaignPerformance = (data: AdData[]) => {
  const campaignMap = new Map<string, { impressions: number; clicks: number; spend: number; sales: number; roas: number }>();
  
  data.forEach(item => {
    if (!campaignMap.has(item.campaignName)) {
      campaignMap.set(item.campaignName, { 
        impressions: 0, 
        clicks: 0,
        spend: 0,
        sales: 0,
        roas: 0
      });
    }
    
    const campaignData = campaignMap.get(item.campaignName)!;
    campaignData.impressions += item.impressions;
    campaignData.clicks += item.linkClicks;
    campaignData.spend += item.amountSpent;
    campaignData.sales += item.purchasesValue;
    campaignData.roas = campaignData.spend > 0 ? campaignData.sales / campaignData.spend : 0;
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
 * Process and save CSV data to Firestore
 */
export const processAndSaveCSVData = async (userId: string, fileName: string, data: Record<string, string>[]) => {
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
        created: serverTimestamp()
      };
      
      batch.set(docRef, transformedRow);
    });
    
    // Save upload info to upload_history collection
    const uploadHistoryRef = doc(collection(db, 'users', userId, 'upload_history'), uploadId);
    batch.set(uploadHistoryRef, {
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
      created: serverTimestamp()
    });
    
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
        dateRange: data.dateRange
      });
    });
    
    console.log(`Found ${uploads.length} upload records`);
    return uploads;
  } catch (error) {
    console.error("Error fetching upload history:", error);
    throw new Error(`Error fetching upload history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
