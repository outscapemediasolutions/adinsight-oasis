import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  orderBy,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "sonner";

// Define the AdData interface
export interface AdData {
  date: string;
  campaignName: string;
  adSetName: string;
  deliveryStatus: string;
  deliveryLevel: string;
  reach: number;
  impressions: number;
  frequency: number;
  attributionSetting: string;
  resultType: string;
  results: number;
  amountSpent: number;
  costPerResult: number;
  purchaseROAS: number;
  purchasesConversionValue: number;
  starts: number;
  ends: number;
  linkClicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpcAll: number;
  clicksAll: number;
  addsToCart: number;
  checkoutsInitiated: number;
  costPerAddToCart: number;
  videoPlaysAt50: number;
  videoPlaysAt75: number;
  videoAveragePlayTime: number;
  instagramProfileVisits: number;
  pageEngagement: number;
  reportingStarts: string;
  reportingEnds: string;
  userId: string;
}

// Upload Record interface
export interface UploadRecord {
  id: string;
  userId: string;
  fileName: string;
  uploadedAt: number; // timestamp
  recordCount: number;
  status: 'completed' | 'failed' | 'processing';
  dateRange?: {
    start: string;
    end: string;
  };
}

// CSV Column headers - must match this exact order
export const csvHeaders = [
  "Date",
  "Campaign name",
  "Ad set name",
  "Delivery status",
  "Delivery level",
  "Reach",
  "Impressions",
  "Frequency",
  "Attribution setting",
  "Result Type",
  "Results",
  "Amount spent (INR)",
  "Cost per result",
  "Purchase ROAS (return on ad spend)",
  "Purchases conversion value",
  "Starts",
  "Ends",
  "Link clicks",
  "CPC (cost per link click)",
  "CPM", // Changed from "CPM (cost per 1,000 impressions)" to simply "CPM"
  "CTR (all)",
  "CPC (all)",
  "Clicks (all)",
  "Adds to cart",
  "Checkouts initiated",
  "Cost per add to cart",
  "Video plays at 50%",
  "Video plays at 75%",
  "Video average play time",
  "Instagram profile visits",
  "Page engagement",
  "Reporting starts",
  "Reporting ends"
];

// Validate CSV headers
export const validateCSVHeaders = (csvData: string) => {
  const lines = csvData.split('\n');
  
  // Get headers from the first line
  const headers = lines[0].split(',').map(header => header.trim());
  
  // Find missing headers
  const missingHeaders = csvHeaders.filter(required => 
    !headers.some(header => header.toLowerCase() === required.toLowerCase())
  );
  
  // Find unknown headers
  const unknownHeaders = headers.filter(header => 
    !csvHeaders.some(required => required.toLowerCase() === header.toLowerCase())
  );
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
    unknownHeaders,
  };
};

// Parse CSV data and return structured data
export const parseCSVData = (csvData: string, columnMapping: Record<string, string> = {}): AdData[] => {
  const lines = csvData.split('\n');
  
  // Check if the CSV has headers
  const originalHeaders = lines[0].split(',').map(header => header.trim());
  
  // Create a mapping of indexes for column mapping
  const headerIndexMap: Record<string, number> = {};
  
  // First, map the original headers to their indices
  originalHeaders.forEach((header, index) => {
    headerIndexMap[header] = index;
  });
  
  // Special case for CPM - check if the file has the longer version of the header
  if (headerIndexMap["CPM (cost per 1,000 impressions)"] !== undefined && headerIndexMap["CPM"] === undefined) {
    // Map the longer version to the shorter one
    headerIndexMap["CPM"] = headerIndexMap["CPM (cost per 1,000 impressions)"];
  }
  
  // Then, apply any custom column mappings
  for (const [originalCol, mappedCol] of Object.entries(columnMapping)) {
    if (headerIndexMap[originalCol] !== undefined) {
      // We're remapping this column to a standard one
      headerIndexMap[mappedCol] = headerIndexMap[originalCol];
    }
  }
  
  // Parse data rows
  const result: AdData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(',').map(value => value.trim());
    if (values.length !== originalHeaders.length) {
      console.warn(`Row ${i} has an incorrect number of columns (${values.length} vs expected ${originalHeaders.length}).`);
      continue; // Skip invalid rows
    }
    
    try {
      // Use the index mapping to get values in the correct order
      const adData: AdData = {
        date: getValueByHeader("Date", values, headerIndexMap),
        campaignName: getValueByHeader("Campaign name", values, headerIndexMap),
        adSetName: getValueByHeader("Ad set name", values, headerIndexMap),
        deliveryStatus: getValueByHeader("Delivery status", values, headerIndexMap),
        deliveryLevel: getValueByHeader("Delivery level", values, headerIndexMap),
        reach: parseFloat(getValueByHeader("Reach", values, headerIndexMap)) || 0,
        impressions: parseFloat(getValueByHeader("Impressions", values, headerIndexMap)) || 0,
        frequency: parseFloat(getValueByHeader("Frequency", values, headerIndexMap)) || 0,
        attributionSetting: getValueByHeader("Attribution setting", values, headerIndexMap),
        resultType: getValueByHeader("Result Type", values, headerIndexMap),
        results: parseFloat(getValueByHeader("Results", values, headerIndexMap)) || 0,
        amountSpent: parseFloat(getValueByHeader("Amount spent (INR)", values, headerIndexMap)) || 0,
        costPerResult: parseFloat(getValueByHeader("Cost per result", values, headerIndexMap)) || 0,
        purchaseROAS: parseFloat(getValueByHeader("Purchase ROAS (return on ad spend)", values, headerIndexMap)) || 0,
        purchasesConversionValue: parseFloat(getValueByHeader("Purchases conversion value", values, headerIndexMap)) || 0,
        starts: parseFloat(getValueByHeader("Starts", values, headerIndexMap)) || 0,
        ends: parseFloat(getValueByHeader("Ends", values, headerIndexMap)) || 0,
        linkClicks: parseFloat(getValueByHeader("Link clicks", values, headerIndexMap)) || 0,
        cpc: parseFloat(getValueByHeader("CPC (cost per link click)", values, headerIndexMap)) || 0,
        cpm: parseFloat(getValueByHeader("CPM", values, headerIndexMap)) || 0, // Updated to use the simplified CPM header
        ctr: parseFloat(getValueByHeader("CTR (all)", values, headerIndexMap)) || 0,
        cpcAll: parseFloat(getValueByHeader("CPC (all)", values, headerIndexMap)) || 0,
        clicksAll: parseFloat(getValueByHeader("Clicks (all)", values, headerIndexMap)) || 0,
        addsToCart: parseFloat(getValueByHeader("Adds to cart", values, headerIndexMap)) || 0,
        checkoutsInitiated: parseFloat(getValueByHeader("Checkouts initiated", values, headerIndexMap)) || 0,
        costPerAddToCart: parseFloat(getValueByHeader("Cost per add to cart", values, headerIndexMap)) || 0,
        videoPlaysAt50: parseFloat(getValueByHeader("Video plays at 50%", values, headerIndexMap)) || 0,
        videoPlaysAt75: parseFloat(getValueByHeader("Video plays at 75%", values, headerIndexMap)) || 0,
        videoAveragePlayTime: parseFloat(getValueByHeader("Video average play time", values, headerIndexMap)) || 0,
        instagramProfileVisits: parseFloat(getValueByHeader("Instagram profile visits", values, headerIndexMap)) || 0,
        pageEngagement: parseFloat(getValueByHeader("Page engagement", values, headerIndexMap)) || 0,
        reportingStarts: getValueByHeader("Reporting starts", values, headerIndexMap),
        reportingEnds: getValueByHeader("Reporting ends", values, headerIndexMap),
        userId: "", // Will be set when saving to Firestore
      };
      
      // Validate data
      if (!validateDataRow(adData)) {
        console.warn(`Row ${i} contains invalid data. Skipping.`);
        continue;
      }
      
      result.push(adData);
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
      throw new Error(`Row ${i} contains invalid data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  if (result.length === 0) {
    throw new Error("No valid data rows found in the CSV file.");
  }
  
  return result;
};

// Helper function to get value by header name using the mapping
const getValueByHeader = (headerName: string, values: string[], headerIndexMap: Record<string, number>): string => {
  const index = headerIndexMap[headerName];
  if (index === undefined) {
    throw new Error(`Required column '${headerName}' is missing`);
  }
  return values[index] || "";
};

// Validate individual data row
const validateDataRow = (data: AdData): boolean => {
  // Check for negative values in numeric fields
  if (
    data.reach < 0 ||
    data.impressions < 0 ||
    data.frequency < 0 ||
    data.results < 0 ||
    data.amountSpent < 0 ||
    data.linkClicks < 0
  ) {
    return false;
  }
  
  // Check date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(data.date)) {
    return false;
  }
  
  return true;
};

// Save ad data to Firestore and record the upload
export const saveAdData = async (
  data: AdData[], 
  userId: string, 
  overwrite: boolean = false,
  fileName: string = "data-upload.csv"
) => {
  try {
    console.log(`Starting saveAdData: ${data.length} records, overwrite=${overwrite}`);
    
    // Start by creating an upload record
    const uploadRecord = {
      userId,
      fileName,
      uploadedAt: Date.now(),
      recordCount: data.length,
      status: 'processing' as const,
      dateRange: {
        start: data.reduce((min, item) => !min || item.date < min ? item.date : min, ""),
        end: data.reduce((max, item) => !max || item.date > max ? item.date : max, ""),
      }
    };
    
    console.log("Creating upload record");
    const uploadRef = await addDoc(collection(db, "uploads"), uploadRecord);
    console.log("Upload record created with ID:", uploadRef.id);
    
    // Check for existing data with same date, campaign, and ad set
    let savedCount = 0;
    let skippedCount = 0;
    
    for (const item of data) {
      item.userId = userId;
      
      const existingQuery = query(
        collection(db, "adData"),
        where("userId", "==", userId),
        where("date", "==", item.date),
        where("campaignName", "==", item.campaignName),
        where("adSetName", "==", item.adSetName)
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // Data already exists
        if (overwrite) {
          // Update existing document
          const docId = existingDocs.docs[0].id;
          await updateDoc(doc(db, "adData", docId), { ...item });
          savedCount++;
        } else {
          // Skip this item
          skippedCount++;
        }
      } else {
        // Add new document
        await addDoc(collection(db, "adData"), item);
        savedCount++;
      }
    }
    
    console.log(`Completed processing: Saved ${savedCount}, Skipped ${skippedCount}`);
    
    // Update the upload record with final status
    await updateDoc(doc(db, "uploads", uploadRef.id), {
      status: 'completed',
      recordCount: savedCount
    });
    
    // Show success message
    if (savedCount > 0 && skippedCount === 0) {
      toast.success(`Successfully saved ${savedCount} data entries.`);
    } else if (savedCount > 0 && skippedCount > 0) {
      toast.success(`Saved ${savedCount} entries. Skipped ${skippedCount} duplicate entries.`);
    } else if (savedCount === 0 && skippedCount > 0) {
      toast.warning(`Skipped all ${skippedCount} entries as they already exist. Use 'Overwrite' option to update existing data.`);
    }
    
    return { savedCount, skippedCount, uploadId: uploadRef.id };
  } catch (error) {
    console.error("Error saving ad data:", error);
    toast.error("Failed to save data. Please try again.");
    throw error;
  }
};

// Get user's upload history
export const getUserUploads = async (userId: string): Promise<UploadRecord[]> => {
  try {
    const q = query(
      collection(db, "uploads"),
      where("userId", "==", userId),
      orderBy("uploadedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const uploads: UploadRecord[] = [];
    querySnapshot.forEach((doc) => {
      uploads.push({
        id: doc.id,
        ...doc.data()
      } as UploadRecord);
    });
    
    return uploads;
  } catch (error) {
    console.error("Error getting upload history:", error);
    throw error;
  }
};

// Download historical data based on upload ID
export const downloadHistoricalData = async (
  userId: string, 
  uploadId: string, 
  format: "csv" | "json" = "csv"
) => {
  try {
    // First get the upload record
    const uploadDoc = await getDoc(doc(db, "uploads", uploadId));
    
    if (!uploadDoc.exists()) {
      throw new Error("Upload record not found");
    }
    
    const uploadData = uploadDoc.data() as UploadRecord;
    
    // Verify the user has permission
    if (uploadData.userId !== userId) {
      throw new Error("You don't have permission to access this data");
    }
    
    // Get the actual data
    let q = query(
      collection(db, "adData"),
      where("userId", "==", userId)
    );
    
    // Add date range filter if available
    if (uploadData.dateRange?.start && uploadData.dateRange?.end) {
      q = query(
        q, 
        where("date", ">=", uploadData.dateRange.start),
        where("date", "<=", uploadData.dateRange.end)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    const data: AdData[] = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data() as AdData);
    });
    
    // Format and download the data
    let downloadContent: string;
    let fileName: string;
    let mimeType: string;
    
    if (format === "csv") {
      downloadContent = convertToCSV(data);
      fileName = `adpulse_export_${new Date().toISOString().slice(0, 10)}.csv`;
      mimeType = "text/csv";
    } else {
      downloadContent = JSON.stringify(data, null, 2);
      fileName = `adpulse_export_${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = "application/json";
    }
    
    // Create and trigger download
    const blob = new Blob([downloadContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, recordCount: data.length };
  } catch (error) {
    console.error("Error downloading historical data:", error);
    throw error;
  }
};

// Convert data to CSV
const convertToCSV = (data: AdData[]): string => {
  // Create CSV header
  const csvRows = [csvHeaders.join(',')];
  
  // Add data rows
  for (const item of data) {
    const row = [
      item.date,
      `"${item.campaignName.replace(/"/g, '""')}"`, // Escape quotes
      `"${item.adSetName.replace(/"/g, '""')}"`,
      item.deliveryStatus,
      item.deliveryLevel,
      item.reach,
      item.impressions,
      item.frequency,
      item.attributionSetting,
      item.resultType,
      item.results,
      item.amountSpent,
      item.costPerResult,
      item.purchaseROAS,
      item.purchasesConversionValue,
      item.starts,
      item.ends,
      item.linkClicks,
      item.cpc,
      item.cpm,
      item.ctr,
      item.cpcAll,
      item.clicksAll,
      item.addsToCart,
      item.checkoutsInitiated,
      item.costPerAddToCart,
      item.videoPlaysAt50,
      item.videoPlaysAt75,
      item.videoAveragePlayTime,
      item.instagramProfileVisits,
      item.pageEngagement,
      item.reportingStarts,
      item.reportingEnds
    ];
    
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
};

// Generate CSV template
export const generateCSVTemplate = (): string => {
  return csvHeaders.join(',');
};

// Get ad data from Firestore
export const getAdData = async (userId: string, startDate?: string, endDate?: string, campaignName?: string, adSetName?: string) => {
  try {
    let q = query(
      collection(db, "adData"),
      where("userId", "==", userId)
    );
    
    // Add date range filter if provided
    if (startDate && endDate) {
      q = query(q, where("date", ">=", startDate), where("date", "<=", endDate));
    }
    
    // Apply additional filters if provided
    if (campaignName) {
      q = query(q, where("campaignName", "==", campaignName));
    }
    
    if (adSetName) {
      q = query(q, where("adSetName", "==", adSetName));
    }
    
    // Order by date
    q = query(q, orderBy("date", "asc"));
    
    const querySnapshot = await getDocs(q);
    
    const data: AdData[] = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data() as AdData);
    });
    
    return data;
  } catch (error) {
    console.error("Error getting ad data:", error);
    toast.error("Failed to fetch data. Please try again.");
    throw error;
  }
};

// Get unique campaign names
export const getUniqueCampaigns = async (userId: string) => {
  try {
    const q = query(
      collection(db, "adData"),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const campaigns = new Set<string>();
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AdData;
      campaigns.add(data.campaignName);
    });
    
    return Array.from(campaigns);
  } catch (error) {
    console.error("Error getting unique campaigns:", error);
    throw error;
  }
};

// Get unique ad set names
export const getUniqueAdSets = async (userId: string, campaignName?: string) => {
  try {
    let q = query(
      collection(db, "adData"),
      where("userId", "==", userId)
    );
    
    if (campaignName) {
      q = query(q, where("campaignName", "==", campaignName));
    }
    
    const querySnapshot = await getDocs(q);
    
    const adSets = new Set<string>();
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AdData;
      adSets.add(data.adSetName);
    });
    
    return Array.from(adSets);
  } catch (error) {
    console.error("Error getting unique ad sets:", error);
    throw error;
  }
};

// Get date range of available data
export const getDateRange = async (userId: string) => {
  try {
    const q = query(
      collection(db, "adData"),
      where("userId", "==", userId),
      orderBy("date", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { minDate: null, maxDate: null };
    }
    
    const dates = querySnapshot.docs.map(doc => doc.data().date);
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    
    return { minDate, maxDate };
  } catch (error) {
    console.error("Error getting date range:", error);
    throw error;
  }
};

// Delete ad data
export const deleteAdData = async (userId: string, date: string, campaignName: string, adSetName: string) => {
  try {
    const q = query(
      collection(db, "adData"),
      where("userId", "==", userId),
      where("date", "==", date),
      where("campaignName", "==", campaignName),
      where("adSetName", "==", adSetName)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Delete the document
      await deleteDoc(doc(db, "adData", querySnapshot.docs[0].id));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error deleting ad data:", error);
    throw error;
  }
};

// Calculate performance metrics
export const calculateMetrics = (data: AdData[]) => {
  // Initialize metrics
  let totalSpend = 0;
  let totalSales = 0;
  let totalOrders = 0;
  let totalVisitors = 0;
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalAddToCart = 0;
  let totalCheckoutInitiated = 0;
  
  // Calculate metrics
  data.forEach(item => {
    totalSpend += item.amountSpent;
    totalSales += item.purchasesConversionValue;
    totalOrders += item.results; // Assuming results are orders/conversions
    totalVisitors += item.linkClicks;
    totalClicks += item.clicksAll;
    totalImpressions += item.impressions;
    totalAddToCart += item.addsToCart;
    totalCheckoutInitiated += item.checkoutsInitiated;
  });
  
  // Calculate derived metrics
  const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0;
  const cvr = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
  const visitorsPerOrder = totalOrders > 0 ? totalVisitors / totalOrders : 0;
  const costPerResult = totalOrders > 0 ? totalSpend / totalOrders : 0;
  
  return {
    totalSpend,
    totalSales,
    totalOrders,
    totalVisitors,
    totalClicks,
    totalImpressions,
    totalAddToCart,
    totalCheckoutInitiated,
    roas,
    cpc,
    cpm,
    ctr,
    aov,
    cvr,
    visitorsPerOrder,
    costPerResult
  };
};

// Get campaign performance
export const getCampaignPerformance = (data: AdData[]) => {
  // Group data by campaign
  const campaigns = new Map<string, AdData[]>();
  
  data.forEach(item => {
    if (!campaigns.has(item.campaignName)) {
      campaigns.set(item.campaignName, []);
    }
    campaigns.get(item.campaignName)?.push(item);
  });
  
  // Calculate metrics for each campaign
  const campaignMetrics: { campaignName: string; metrics: ReturnType<typeof calculateMetrics> }[] = [];
  
  campaigns.forEach((campaignData, campaignName) => {
    const metrics = calculateMetrics(campaignData);
    campaignMetrics.push({ campaignName, metrics });
  });
  
  return campaignMetrics;
};

// Get ad set performance
export const getAdSetPerformance = (data: AdData[]) => {
  // Group data by ad set
  const adSets = new Map<string, AdData[]>();
  
  data.forEach(item => {
    const key = `${item.campaignName}_${item.adSetName}`;
    if (!adSets.has(key)) {
      adSets.set(key, []);
    }
    adSets.get(key)?.push(item);
  });
  
  // Calculate metrics for each ad set
  const adSetMetrics: { 
    campaignName: string; 
    adSetName: string; 
    metrics: ReturnType<typeof calculateMetrics> 
  }[] = [];
  
  adSets.forEach((adSetData, key) => {
    const [campaignName, adSetName] = key.split('_');
    const metrics = calculateMetrics(adSetData);
    adSetMetrics.push({ campaignName, adSetName, metrics });
  });
  
  return adSetMetrics;
};

// Get aggregated data by date
export const getDataByDate = (data: AdData[]) => {
  // Group data by date
  const dates = new Map<string, AdData[]>();
  
  data.forEach(item => {
    if (!dates.has(item.date)) {
      dates.set(item.date, []);
    }
    dates.get(item.date)?.push(item);
  });
  
  // Calculate metrics for each date
  const dateMetrics: { date: string; metrics: ReturnType<typeof calculateMetrics> }[] = [];
  
  dates.forEach((dateData, date) => {
    const metrics = calculateMetrics(dateData);
    dateMetrics.push({ date, metrics });
  });
  
  // Sort by date
  dateMetrics.sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  return dateMetrics;
};
