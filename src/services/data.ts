
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, writeBatch, deleteDoc, QueryConstraint, addDoc } from "firebase/firestore";

// Update AdData interface to match Meta Ads column structure
export interface AdData {
  id?: string;
  userId?: string;
  uploadId?: string;
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
  resultType?: string;
  costPerResult: number;
  purchases: number;
  purchaseConversionValue: number;
  purchaseRoas: number;
  frequency?: number;
  reach?: number;
  addsToCart?: number;
  checkoutsInitiated?: number;
  costPerAddToCart?: number;
  cpm?: number;
  videoPlays?: number;
  profileVisits?: number;
  pageEngagement?: number;
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
  'Result Type': 'resultType',
  'Cost per result': 'costPerResult',
  'Purchases': 'purchases',
  'Purchases conversion value': 'purchaseConversionValue',
  'Purchase ROAS': 'purchaseRoas',
  'Frequency': 'frequency',
  'Reach': 'reach',
  'Adds to cart': 'addsToCart',
  'Checkouts initiated': 'checkoutsInitiated',
  'Cost per add to cart': 'costPerAddToCart',
  'CPM (cost per 1,000 impressions)': 'cpm',
  'Video plays at 50%': 'videoPlays50',
  'Video plays at 75%': 'videoPlays75',
  'Video average play time': 'videoAvgPlayTime',
  'Instagram profile visits': 'profileVisits',
  'Page engagement': 'pageEngagement'
};

// List of CSV headers for template
export const csvHeaders = [
  'Date',
  'Campaign name',
  'Ad set name',
  'Objective',
  'Impressions',
  'Link clicks',
  'CTR (All)',
  'CPC (cost per link click)',
  'Amount spent (INR)',
  'Results',
  'Result Type',
  'Cost per result',
  'Purchases',
  'Purchases conversion value',
  'Purchase ROAS'
];

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

// Generate a CSV template with headers and sample data
export const generateCSVTemplate = (): string => {
  // Create headers row
  const headerRow = csvHeaders.join(',');
  
  // Create sample data rows
  const sampleRows = [
    // Sample row 1: E-commerce campaign with good ROAS
    [
      '2023-01-01',
      'Summer Sale Campaign',
      'Broad Audience',
      'Sales',
      '5000',
      '150',
      '3%',
      '15.5',
      '2325',
      '25',
      'Purchases',
      '93',
      '20',
      '6500',
      '2.8'
    ].join(','),
    
    // Sample row 2: Traffic campaign with high CTR
    [
      '2023-01-02',
      'Brand Awareness',
      'Lookalike Audience',
      'Traffic',
      '10000',
      '450',
      '4.5%',
      '10.2',
      '4590',
      '450',
      'Link clicks',
      '10.2',
      '5',
      '1500',
      '0.33'
    ].join(','),
    
    // Sample row 3: Conversion campaign for leads
    [
      '2023-01-03',
      'Lead Generation',
      'Interest Targeting',
      'Lead generation',
      '7500',
      '200',
      '2.67%',
      '18.75',
      '3750',
      '35',
      'Leads',
      '107.14',
      '0',
      '0',
      '0'
    ].join(',')
  ];
  
  // Combine headers and sample data
  return [headerRow, ...sampleRows].join('\n');
};

// Define column mappings for header validation
export const columnMappings: Record<string, string[]> = {
  'Date': ['date', 'reporting date'],
  'Campaign name': ['campaign name', 'campaign', 'campaign_name'],
  'Ad set name': ['ad set name', 'ad set', 'adset name', 'adset'],
  'Objective': ['objective', 'campaign objective'],
  'Impressions': ['impressions', 'impr.'],
  'Link clicks': ['link clicks', 'clicks', 'link click'],
  'CTR (All)': ['ctr (all)', 'ctr', 'click-through rate', 'clickthrough rate'],
  'CPC (cost per link click)': ['cpc (cost per link click)', 'cpc', 'cost per click'],
  'CPM (cost per 1,000 impressions)': ['cpm (cost per 1,000 impressions)', 'cpm', 'cost per 1000 impressions'],
  'Amount spent (INR)': ['amount spent (inr)', 'amount spent', 'spend', 'cost'],
  'Results': ['results', 'result', 'conversions'],
  'Result Type': ['result type', 'result_type', 'conversion type'],
  'Cost per result': ['cost per result', 'cpa', 'cost per acquisition', 'cost per conversion'],
  'Purchases': ['purchases', 'purchase', 'conversions: purchase'],
  'Purchases conversion value': ['purchases conversion value', 'conversion value', 'purchase value', 'revenue'],
  'Purchase ROAS': ['purchase roas', 'roas', 'return on ad spend']
};

// Validate CSV headers against required columns
export const validateCSVHeaders = (csvData: string) => {
  const lines = csvData.split('\n');
  if (lines.length === 0) {
    return {
      isValid: false,
      missingHeaders: ['Empty file'],
      mappedHeaders: []
    };
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Compare headers against required columns using case-insensitive comparison
  const missingHeaders: string[] = [];
  const mappedHeaders = [...headers];
  
  REQUIRED_COLUMNS.forEach(requiredHeader => {
    const mappingOptions = columnMappings[requiredHeader] || [requiredHeader.toLowerCase()];
    const headerExists = headers.some(header => 
      mappingOptions.includes(header.toLowerCase())
    );
    
    if (!headerExists) {
      missingHeaders.push(requiredHeader);
    }
  });
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
    mappedHeaders
  };
};

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
export const convertCSVRowToAdData = (row: Record<string, string>, userId: string, uploadId: string): AdData => {
  const adData: Partial<AdData> = { userId, uploadId };
  
  Object.entries(CSV_COLUMN_MAPPING).forEach(([csvColumn, dataField]) => {
    if (row[csvColumn] !== undefined) {
      // Convert numeric values
      if (['impressions', 'clicks', 'spend', 'results', 'purchases', 'purchaseConversionValue', 'reach', 'frequency', 'addsToCart', 'checkoutsInitiated', 'videoPlays50', 'videoPlays75', 'profileVisits', 'pageEngagement'].includes(dataField)) {
        adData[dataField] = parseFloat(row[csvColumn].replace(/,/g, '')) || 0;
      } 
      // Convert percentage values 
      else if (['ctr', 'purchaseRoas'].includes(dataField)) {
        const value = row[csvColumn].replace(/%/g, '');
        adData[dataField] = parseFloat(value) || 0;
      }
      // Handle cost metrics
      else if (['cpc', 'costPerResult', 'costPerAddToCart', 'cpm'].includes(dataField)) {
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

// Helper function to parse CSV data
export const parseCSVData = (csvText: string, columnMapping: Record<string, string> = {}): AdData[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) {
    throw new Error("CSV file does not contain enough data");
  }
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Apply column mapping if provided
  const mappedHeaders = headers.map(header => {
    if (columnMapping[header]) {
      return columnMapping[header];
    }
    return header;
  });
  
  // Parse data rows
  const result: AdData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(',');
    
    // Create a record for this row
    const record: Record<string, string> = {};
    mappedHeaders.forEach((header, index) => {
      if (index < values.length) {
        record[header] = values[index].trim();
      }
    });
    
    try {
      // Convert to AdData
      const adData: AdData = {
        campaignName: record['Campaign name'] || '',
        adSetName: record['Ad set name'] || '',
        date: record['Date'] || '',
        objective: record['Objective'] || '',
        impressions: parseFloat(record['Impressions']?.replace(/,/g, '') || '0'),
        clicks: parseFloat(record['Link clicks']?.replace(/,/g, '') || '0'),
        ctr: parseFloat(record['CTR (All)']?.replace(/%/g, '') || '0'),
        cpc: parseFloat(record['CPC (cost per link click)']?.replace(/[₹,]/g, '') || '0'),
        spend: parseFloat(record['Amount spent (INR)']?.replace(/[₹,]/g, '') || '0'),
        results: parseFloat(record['Results']?.replace(/,/g, '') || '0'),
        resultType: record['Result Type'] || '',
        costPerResult: parseFloat(record['Cost per result']?.replace(/[₹,]/g, '') || '0'),
        purchases: parseFloat(record['Purchases']?.replace(/,/g, '') || '0'),
        purchaseConversionValue: parseFloat(record['Purchases conversion value']?.replace(/[₹,]/g, '') || '0'),
        purchaseRoas: parseFloat(record['Purchase ROAS']?.replace(/%/g, '') || '0')
      };
      
      // Add additional fields if present
      if (record['Frequency']) {
        adData.frequency = parseFloat(record['Frequency'].replace(/,/g, ''));
      }
      
      if (record['Reach']) {
        adData.reach = parseFloat(record['Reach'].replace(/,/g, ''));
      }
      
      if (record['Adds to cart']) {
        adData.addsToCart = parseFloat(record['Adds to cart'].replace(/,/g, ''));
      }
      
      if (record['Checkouts initiated']) {
        adData.checkoutsInitiated = parseFloat(record['Checkouts initiated'].replace(/,/g, ''));
      }
      
      if (record['CPM (cost per 1,000 impressions)']) {
        adData.cpm = parseFloat(record['CPM (cost per 1,000 impressions)'].replace(/[₹,]/g, ''));
      }
      
      // Add to result array
      result.push(adData);
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
      // Continue with next row
    }
  }
  
  return result;
};

// Define interface for upload records
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

// Save ad data to Firestore
export const saveAdData = async (
  data: AdData[], 
  userId: string, 
  fileName: string = "upload.csv"
): Promise<UploadRecord> => {
  const db = getFirestore();
  
  // Create a reference to the upload_history collection
  const uploadsRef = collection(db, 'upload_history');
  const uploadDocRef = doc(collection(db, 'upload_history'));
  const uploadId = uploadDocRef.id;
  
  try {
    console.log(`Saving ${data.length} records for user ${userId}`);
    
    // Extract date range from data
    let minDate = '';
    let maxDate = '';
    
    data.forEach(row => {
      if (!minDate || row.date < minDate) minDate = row.date;
      if (!maxDate || row.date > maxDate) maxDate = row.date;
    });
    
    // Create upload record
    const uploadRecord: UploadRecord = {
      id: uploadId,
      userId,
      fileName,
      uploadedAt: Date.now(),
      status: 'processing',
      recordCount: data.length,
      dateRange: {
        start: minDate,
        end: maxDate
      }
    };
    
    // Save upload record first
    await setDoc(uploadDocRef, uploadRecord);
    
    // Save each ad record
    const batch = writeBatch(db);
    const adsCollectionRef = collection(db, 'ads');
    
    let count = 0;
    for (const item of data) {
      // Add userId and uploadId to the data
      const adData = { ...item, userId, uploadId };
      
      // Create a new document reference
      const adRef = doc(adsCollectionRef);
      
      // Set the data with the document ID
      batch.set(adRef, { ...adData, id: adRef.id });
      count++;
      
      // Firestore batches are limited to 500 operations
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${count} records`);
      }
    }
    
    // Commit any remaining operations
    if (count % 400 !== 0) {
      await batch.commit();
      console.log(`Committed final batch, total records: ${count}`);
    }
    
    // Update upload record status to completed
    await setDoc(
      uploadDocRef, 
      { status: 'completed' }, 
      { merge: true }
    );
    
    console.log(`Successfully saved ${data.length} rows and created upload record`);
    
    // Return the complete upload record
    return {
      ...uploadRecord,
      status: 'completed'
    };
  } catch (error) {
    console.error("Error saving ad data:", error);
    
    // Update upload record with failed status
    await setDoc(
      uploadDocRef, 
      { 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { merge: true }
    );
    
    throw error;
  }
};

// Process and save uploaded CSV data
export const processAndSaveCSVData = async (
  userId: string,
  fileName: string,
  rows: Record<string, string>[]
): Promise<UploadRecord> => {
  // Create a reference to the upload record
  const db = getFirestore();
  const uploadRef = doc(collection(db, 'upload_history'));
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
    
    // Create upload record
    const uploadRecord: UploadRecord = {
      id: uploadId,
      userId,
      fileName,
      uploadedAt: Date.now(),
      status: 'processing',
      recordCount: rows.length,
      dateRange: {
        start: minDate,
        end: maxDate
      }
    };
    
    // Save upload record first
    await setDoc(uploadRef, uploadRecord);
    
    // Convert and save each row
    const batch = writeBatch(db);
    const adsCollectionRef = collection(db, 'ads');
    
    let count = 0;
    for (const row of rows) {
      const adData = convertCSVRowToAdData(row, userId, uploadId);
      const adRef = doc(adsCollectionRef);
      batch.set(adRef, { ...adData, id: adRef.id });
      count++;
      
      // Firestore batches are limited to 500 operations
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${count} records`);
      }
    }
    
    // Commit any remaining operations
    if (count % 400 !== 0) {
      await batch.commit();
      console.log(`Committed final batch, total records: ${count}`);
    }
    
    // Update upload record status to completed
    await setDoc(
      uploadRef, 
      { status: 'completed' }, 
      { merge: true }
    );
    
    console.log(`Successfully saved ${rows.length} rows and created upload record`);
    
    // Return the complete upload record
    return {
      ...uploadRecord,
      status: 'completed'
    };
  } catch (error) {
    console.error("Error processing CSV data:", error);
    
    // Update upload record with failed status
    await setDoc(
      uploadRef, 
      { 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { merge: true }
    );
    
    // Re-throw the error
    throw error;
  }
};

// Get user uploads history
export const getUserUploads = async (userId: string): Promise<UploadRecord[]> => {
  try {
    const db = getFirestore();
    const uploadsRef = collection(db, 'upload_history');
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
    const uploadRef = doc(db, 'upload_history', uploadId);
    const uploadDoc = await getDoc(uploadRef);
    
    if (!uploadDoc.exists() || uploadDoc.data().userId !== userId) {
      console.error("Upload not found or not owned by user");
      return false;
    }
    
    // 1. Delete all ad data associated with this upload
    const adsRef = collection(db, 'ads');
    const q = query(adsRef, where('uploadId', '==', uploadId));
    const adsSnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    adsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // 2. Delete the upload record
    await deleteDoc(uploadRef);
    
    console.log(`Successfully deleted upload ${uploadId} and ${adsSnapshot.size} associated records`);
    return true;
  } catch (error) {
    console.error("Error deleting upload:", error);
    return false;
  }
};

// Download historical data from a specific upload
export const downloadHistoricalData = async (
  userId: string, 
  uploadId: string, 
  format: "csv" | "json" = "csv"
): Promise<void> => {
  try {
    const db = getFirestore();
    
    // Get the upload record
    const uploadRef = doc(db, 'upload_history', uploadId);
    const uploadDoc = await getDoc(uploadRef);
    
    if (!uploadDoc.exists() || uploadDoc.data().userId !== userId) {
      throw new Error("Upload not found or not owned by user");
    }
    
    const uploadData = uploadDoc.data() as UploadRecord;
    
    // Query all ad data from this upload
    const adsRef = collection(db, 'ads');
    const q = query(adsRef, where('uploadId', '==', uploadId));
    
    const adsSnapshot = await getDocs(q);
    const adsData: AdData[] = [];
    
    adsSnapshot.forEach(doc => {
      adsData.push({ id: doc.id, ...doc.data() } as AdData);
    });
    
    if (adsData.length === 0) {
      throw new Error("No data found for this upload");
    }
    
    // Format and trigger download
    const fileName = `adpulse_export_${uploadData.fileName || 'data'}_${new Date().toISOString().split('T')[0]}`;
    
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

// Export data to CSV file
export const exportToCSV = (data: AdData[], fileName = 'adpulse_export'): void => {
  try {
    // Convert to CSV
    const headers = Object.keys(CSV_COLUMN_MAPPING).join(',');
    const rows = data.map(ad => {
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
    
    console.log(`Exported ${data.length} records to ${fileName}.csv`);
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    throw error;
  }
};

// Get ad data with proper filter options
export const getAdData = async (
  userId: string, 
  filters?: {
    startDate?: string,
    endDate?: string,
    campaignName?: string,
    adSetName?: string,
    uploadId?: string
  }
): Promise<AdData[]> => {
  try {
    const db = getFirestore();
    const adsRef = collection(db, 'ads');
    
    // Start with base query
    let constraints: QueryConstraint[] = [
      where('userId', '==', userId)
    ];
    
    // Add upload filter (highest priority)
    if (filters?.uploadId) {
      constraints.push(where('uploadId', '==', filters.uploadId));
    }
    
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
  let totalVisitors = 0;
  
  // Aggregate metrics
  data.forEach(item => {
    totalImpressions += item.impressions || 0;
    totalClicks += item.clicks || 0;
    totalSpend += item.spend || 0;
    totalSales += item.purchaseConversionValue || 0; // Always use Purchases Conversion Value for Sales/Revenue
    totalPurchases += item.purchases || 0;
    totalResults += item.results || 0;
    
    // Count as orders only if objective is Sales or resultType is Purchases
    if (
      (item.objective?.toLowerCase().includes('sales') || 
       item.resultType?.toLowerCase().includes('purchase'))
    ) {
      totalOrders += item.results || 0;
    }
    
    // Count visitors as link clicks
    totalVisitors += item.clicks || 0;
  });
  
  // Calculate derived metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
  
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
    conversionRate
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
    .sort((a, b) => b.metrics.totalSales - a.metrics.totalSales);
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
    .sort((a, b) => b.metrics.totalSales - a.metrics.totalSales);
};
