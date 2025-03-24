import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, writeBatch, deleteDoc, QueryConstraint } from "firebase/firestore";

// Update AdData interface to match Meta Ads column structure
export interface AdData {
  id?: string;
  userId?: string;
  campaignName: string;
  adSetName: string;
  date: string;
  objective: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  results: number;
  costPerResult: number;
  purchases: number;
  purchaseConversionValue: number;
  purchaseRoas: number;
  [key: string]: any; // For dynamic columns
}

// Updated column mapping for Meta Ads data
export const CSV_COLUMN_MAPPING: Record<string, string> = {
  'Date': 'date',
  'Campaign name': 'campaignName',
  'Ad set name': 'adSetName',
  'Objective': 'objective',
  'Impressions': 'impressions',
  'Link clicks': 'clicks',
  'CTR (All)': 'ctr',
  'CPC (cost per link click)': 'cpc',
  'Amount spent (INR)': 'spend',
  'Results': 'results',
  'Cost per result': 'costPerResult',
  'Purchases': 'purchases',
  'Purchases conversion value': 'purchaseConversionValue',
  'Purchase ROAS': 'purchaseRoas'
};

// Required columns for validation
export const REQUIRED_COLUMNS = [
  'Date',
  'Campaign name',
  'Ad set name',
  'Amount spent (INR)',
  'Results',
  'Cost per result',
  'Purchases conversion value',
  'Purchase ROAS',
  'CPC (cost per link click)',
  'CTR (All)',
  'Link clicks',
  'Impressions'
];

// Validate CSV data has all required columns
export const validateCSVData = (headers: string[]) => {
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    return {
      valid: false,
      message: `Missing required columns: ${missingColumns.join(', ')}`
    };
  }
  return { valid: true, message: 'CSV data is valid' };
};

// Convert raw CSV row to AdData format
export const convertCSVRowToAdData = (row: Record<string, string>, userId: string): AdData => {
  const adData: Partial<AdData> = { userId };
  
  Object.entries(CSV_COLUMN_MAPPING).forEach(([csvColumn, dataField]) => {
    if (row[csvColumn] !== undefined) {
      // Convert numeric values
      if (['impressions', 'clicks', 'spend', 'results', 'purchases', 'purchaseConversionValue'].includes(dataField)) {
        adData[dataField] = parseFloat(row[csvColumn].replace(/,/g, '')) || 0;
      } 
      // Convert percentage values 
      else if (['ctr', 'purchaseRoas'].includes(dataField)) {
        const value = row[csvColumn].replace(/%/g, '');
        adData[dataField] = parseFloat(value) || 0;
      }
      // Handle cost metrics
      else if (['cpc', 'costPerResult'].includes(dataField)) {
        adData[dataField] = parseFloat(row[csvColumn].replace(/[₹,]/g, '')) || 0;
      }
      // Keep string values as-is
      else {
        adData[dataField] = row[csvColumn];
      }
    }
  });

  return adData as AdData;
};

// Save upload record with metadata
export interface DateRange {
  start: string;
  end: string;
}

export interface UploadRecord {
  id: string;
  userId: string;
  fileName: string;
  uploadedAt: number;
  status: 'processing' | 'completed' | 'failed';
  recordCount: number;
  dateRange?: DateRange;
  errorMessage?: string;
}

// Process and save uploaded CSV data
export const processAndSaveCSVData = async (
  userId: string,
  fileName: string,
  rows: Record<string, string>[]
): Promise<UploadRecord> => {
  // Create a reference to the upload record
  const db = getFirestore();
  const uploadRef = doc(collection(db, 'uploads'));
  const uploadId = uploadRef.id;
  
  try {
    console.log(`Processing ${rows.length} rows for user ${userId}`);
    
    // Validate required columns
    const headers = Object.keys(rows[0] || {});
    const validation = validateCSVData(headers);
    
    if (!validation.valid) {
      console.error("CSV validation failed:", validation.message);
      
      // Save failed upload record
      const uploadRecord: UploadRecord = {
        id: uploadId,
        userId,
        fileName,
        uploadedAt: Date.now(),
        status: 'failed',
        recordCount: 0,
        errorMessage: validation.message
      };
      
      await setDoc(uploadRef, uploadRecord);
      return uploadRecord;
    }
    
    // Extract date range from data
    let minDate = '';
    let maxDate = '';
    
    rows.forEach(row => {
      const date = row['Date'];
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    });
    
    // Convert and save each row
    const batch = writeBatch(db);
    const adsCollectionRef = collection(db, 'ads');
    
    rows.forEach(row => {
      const adData = convertCSVRowToAdData(row, userId);
      const adRef = doc(adsCollectionRef);
      batch.set(adRef, { ...adData, id: adRef.id });
    });
    
    await batch.commit();
    
    // Create and save upload record
    const uploadRecord: UploadRecord = {
      id: uploadId,
      userId,
      fileName,
      uploadedAt: Date.now(),
      status: 'completed',
      recordCount: rows.length,
      dateRange: {
        start: minDate,
        end: maxDate
      }
    };
    
    await setDoc(uploadRef, uploadRecord);
    
    console.log(`Successfully saved ${rows.length} rows and created upload record`);
    return uploadRecord;
  } catch (error) {
    console.error("Error processing CSV data:", error);
    
    // Save failed upload record
    const uploadRecord: UploadRecord = {
      id: uploadId,
      userId,
      fileName,
      uploadedAt: Date.now(),
      status: 'failed',
      recordCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
    
    await setDoc(uploadRef, uploadRecord);
    return uploadRecord;
  }
};

// Get user uploads history
export const getUserUploads = async (userId: string): Promise<UploadRecord[]> => {
  try {
    const db = getFirestore();
    const uploadsRef = collection(db, 'uploads');
    const q = query(uploadsRef, where('userId', '==', userId), orderBy('uploadedAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const uploads: UploadRecord[] = [];
    
    querySnapshot.forEach(doc => {
      uploads.push({ id: doc.id, ...doc.data() } as UploadRecord);
    });
    
    console.log(`Retrieved ${uploads.length} uploads for user ${userId}`);
    return uploads;
  } catch (error) {
    console.error("Error fetching user uploads:", error);
    throw error;
  }
};

// Delete upload and associated data
export const deleteUpload = async (userId: string, uploadId: string): Promise<boolean> => {
  try {
    const db = getFirestore();
    
    // Get the upload record to confirm ownership
    const uploadRef = doc(db, 'uploads', uploadId);
    const uploadDoc = await getDoc(uploadRef);
    
    if (!uploadDoc.exists() || uploadDoc.data().userId !== userId) {
      console.error("Upload not found or not owned by user");
      return false;
    }
    
    // For simplicity, we're just deleting the upload record
    // In a production app, you would need to query and delete all associated ad data
    await deleteDoc(uploadRef);
    
    console.log(`Successfully deleted upload ${uploadId}`);
    return true;
  } catch (error) {
    console.error("Error deleting upload:", error);
    return false;
  }
};

// Download historical data
export const downloadHistoricalData = async (
  userId: string, 
  uploadId: string, 
  format: "csv" | "json" = "csv"
): Promise<void> => {
  try {
    const db = getFirestore();
    
    // Get the upload record
    const uploadRef = doc(db, 'uploads', uploadId);
    const uploadDoc = await getDoc(uploadRef);
    
    if (!uploadDoc.exists() || uploadDoc.data().userId !== userId) {
      throw new Error("Upload not found or not owned by user");
    }
    
    const uploadData = uploadDoc.data() as UploadRecord;
    
    // Query all ad data from this upload
    // In a real app, we would link ads to specific uploads
    // For this demo, we'll use the date range as a proxy
    const adsRef = collection(db, 'ads');
    
    let q;
    if (uploadData.dateRange?.start && uploadData.dateRange?.end) {
      q = query(
        adsRef, 
        where('userId', '==', userId),
        where('date', '>=', uploadData.dateRange.start),
        where('date', '<=', uploadData.dateRange.end)
      );
    } else {
      q = query(adsRef, where('userId', '==', userId));
    }
    
    const adsSnapshot = await getDocs(q);
    const adsData: AdData[] = [];
    
    adsSnapshot.forEach(doc => {
      adsData.push({ id: doc.id, ...doc.data() } as AdData);
    });
    
    // Format and trigger download
    const fileName = `adpulse_export_${uploadData.fileName}_${new Date().toISOString().split('T')[0]}`;
    
    if (format === "csv") {
      // Convert to CSV
      const headers = Object.keys(CSV_COLUMN_MAPPING).join(',');
      const rows = adsData.map(ad => {
        return Object.entries(CSV_COLUMN_MAPPING).map(([csvCol, field]) => {
          return ad[field] !== undefined ? ad[field] : '';
        }).join(',');
      });
      
      const csvContent = [headers, ...rows].join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // JSON format
      const blob = new Blob([JSON.stringify(adsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    console.log(`Downloaded data for upload ${uploadId} in ${format} format`);
  } catch (error) {
    console.error("Error downloading historical data:", error);
    throw error;
  }
};

// Get ad data with proper filter options
export const getAdData = async (userId: string, filters?: {
  startDate?: string,
  endDate?: string,
  campaignName?: string,
  adSetName?: string,
  uploadId?: string
}): Promise<AdData[]> => {
  try {
    const db = getFirestore();
    const adsRef = collection(db, 'ads');
    
    // Start with base query
    let constraints: QueryConstraint[] = [
      where('userId', '==', userId)
    ];
    
    // Add date range filters
    if (filters?.startDate && filters?.endDate) {
      constraints.push(where('date', '>=', filters.startDate));
      constraints.push(where('date', '<=', filters.endDate));
    }
    
    // Add campaign filter
    if (filters?.campaignName) {
      constraints.push(where('campaignName', '==', filters.campaignName));
    }
    
    // Add ad set filter
    if (filters?.adSetName) {
      constraints.push(where('adSetName', '==', filters.adSetName));
    }
    
    const q = query(adsRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const data: AdData[] = [];
    querySnapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() } as AdData);
    });
    
    console.log(`Retrieved ${data.length} ad records for user ${userId} with filters:`, filters);
    return data;
  } catch (error) {
    console.error("Error fetching ad data:", error);
    throw error;
  }
};

// Get unique campaign names
export const getUniqueCampaigns = (data: AdData[]): string[] => {
  const campaigns = new Set<string>();
  data.forEach(item => campaigns.add(item.campaignName));
  return Array.from(campaigns);
};

// Get unique ad sets for a campaign
export const getUniqueAdSets = (data: AdData[], campaignName?: string): string[] => {
  const adSets = new Set<string>();
  data.forEach(item => {
    if (!campaignName || item.campaignName === campaignName) {
      adSets.add(item.adSetName);
    }
  });
  return Array.from(adSets);
};

// Get data grouped by date
export const getDataByDate = (data: AdData[]): { date: string, metrics: ReturnType<typeof calculateMetrics> }[] => {
  const dateMap = new Map<string, AdData[]>();
  
  // Group data by date
  data.forEach(item => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, []);
    }
    dateMap.get(item.date)?.push(item);
  });
  
  // Calculate metrics for each date and sort
  return Array.from(dateMap.entries())
    .map(([date, items]) => ({
      date,
      metrics: calculateMetrics(items)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Updated metric calculations based on Meta Ads data structure
export const calculateMetrics = (data: AdData[]) => {
  // Initialize metrics
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalSales = 0;
  let totalPurchases = 0;
  let totalResults = 0;
  let totalOrders = 0;
  
  // Aggregate metrics
  data.forEach(item => {
    totalImpressions += item.impressions || 0;
    totalClicks += item.clicks || 0;
    totalSpend += item.spend || 0;
    totalSales += item.purchaseConversionValue || 0;
    totalPurchases += item.purchases || 0;
    totalResults += item.results || 0;
    
    // Only count results as orders if objective is "Sales"
    if (item.objective?.toLowerCase().includes('sales')) {
      totalOrders += item.results || 0;
    }
  });
  
  // Calculate derived metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
  const cvr = totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0;
  
  // Estimate visitors from clicks (could be refined with actual data)
  const totalVisitors = totalClicks;
  
  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    totalSales,
    totalPurchases,
    totalResults,
    totalOrders,
    totalVisitors,
    ctr,
    cpc,
    cpm,
    roas,
    costPerResult,
    cvr
  };
};

// Get performance metrics by campaign
export const getCampaignPerformance = (data: AdData[]) => {
  // Group by campaign
  const campaignMap = new Map<string, AdData[]>();
  
  data.forEach(item => {
    if (!campaignMap.has(item.campaignName)) {
      campaignMap.set(item.campaignName, []);
    }
    campaignMap.get(item.campaignName)?.push(item);
  });
  
  // Calculate metrics for each campaign
  return Array.from(campaignMap.entries())
    .map(([campaignName, items]) => ({
      campaignName,
      metrics: calculateMetrics(items)
    }))
    .sort((a, b) => b.metrics.totalSpend - a.metrics.totalSpend);
};

// Get performance metrics by ad set
export const getAdSetPerformance = (data: AdData[], campaignName?: string) => {
  // Filter by campaign if provided
  const filteredData = campaignName 
    ? data.filter(item => item.campaignName === campaignName) 
    : data;
  
  // Group by ad set
  const adSetMap = new Map<string, AdData[]>();
  
  filteredData.forEach(item => {
    if (!adSetMap.has(item.adSetName)) {
      adSetMap.set(item.adSetName, []);
    }
    adSetMap.get(item.adSetName)?.push(item);
  });
  
  // Calculate metrics for each ad set
  return Array.from(adSetMap.entries())
    .map(([adSetName, items]) => ({
      adSetName,
      campaignName: items[0]?.campaignName || '',
      metrics: calculateMetrics(items)
    }))
    .sort((a, b) => b.metrics.totalSpend - a.metrics.totalSpend);
};

// Export function to convert data to CSV
export const exportToCSV = (data: AdData[], fileName: string): void => {
  // Get all unique keys from data
  const allKeys = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== 'id' && key !== 'userId') {
        allKeys.add(key);
      }
    });
  });
  
  // Create header row
  const headers = Array.from(allKeys);
  const csvRows = [headers.join(',')];
  
  // Add data rows
  data.forEach(item => {
    const values = headers.map(header => {
      const value = item[header];
      // Handle strings with commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value !== undefined ? value : '';
    });
    csvRows.push(values.join(','));
  });
  
  // Create and download CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
