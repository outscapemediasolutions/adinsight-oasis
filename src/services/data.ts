
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
  getDoc 
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
  "CPM (cost per 1,000 impressions)",
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

// Parse CSV data and return structured data
export const parseCSVData = (csvData: string): AdData[] => {
  const lines = csvData.split('\\n');
  
  // Check if the CSV has headers
  const headers = lines[0].split(',').map(header => header.trim());
  
  // Validate headers
  const headerValid = validateHeaders(headers);
  if (!headerValid) {
    throw new Error("CSV headers do not match the expected format. Please download and use the provided template.");
  }
  
  // Parse data rows
  const result: AdData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(',').map(value => value.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i} has an incorrect number of columns.`);
    }
    
    const adData: AdData = {
      date: values[0],
      campaignName: values[1],
      adSetName: values[2],
      deliveryStatus: values[3],
      deliveryLevel: values[4],
      reach: parseFloat(values[5]) || 0,
      impressions: parseFloat(values[6]) || 0,
      frequency: parseFloat(values[7]) || 0,
      attributionSetting: values[8],
      resultType: values[9],
      results: parseFloat(values[10]) || 0,
      amountSpent: parseFloat(values[11]) || 0,
      costPerResult: parseFloat(values[12]) || 0,
      purchaseROAS: parseFloat(values[13]) || 0,
      purchasesConversionValue: parseFloat(values[14]) || 0,
      starts: parseFloat(values[15]) || 0,
      ends: parseFloat(values[16]) || 0,
      linkClicks: parseFloat(values[17]) || 0,
      cpc: parseFloat(values[18]) || 0,
      cpm: parseFloat(values[19]) || 0,
      ctr: parseFloat(values[20]) || 0,
      cpcAll: parseFloat(values[21]) || 0,
      clicksAll: parseFloat(values[22]) || 0,
      addsToCart: parseFloat(values[23]) || 0,
      checkoutsInitiated: parseFloat(values[24]) || 0,
      costPerAddToCart: parseFloat(values[25]) || 0,
      videoPlaysAt50: parseFloat(values[26]) || 0,
      videoPlaysAt75: parseFloat(values[27]) || 0,
      videoAveragePlayTime: parseFloat(values[28]) || 0,
      instagramProfileVisits: parseFloat(values[29]) || 0,
      pageEngagement: parseFloat(values[30]) || 0,
      reportingStarts: values[31],
      reportingEnds: values[32],
      userId: "", // Will be set when saving to Firestore
    };
    
    // Validate data
    if (!validateDataRow(adData)) {
      throw new Error(`Row ${i} contains invalid data. Please check for negative values or invalid formats.`);
    }
    
    result.push(adData);
  }
  
  return result;
};

// Validate CSV headers
const validateHeaders = (headers: string[]): boolean => {
  if (headers.length !== csvHeaders.length) return false;
  
  for (let i = 0; i < csvHeaders.length; i++) {
    if (headers[i].toLowerCase() !== csvHeaders[i].toLowerCase()) {
      return false;
    }
  }
  
  return true;
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

// Save ad data to Firestore
export const saveAdData = async (data: AdData[], userId: string, overwrite: boolean = false) => {
  try {
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
    
    // Show success message
    if (savedCount > 0 && skippedCount === 0) {
      toast.success(`Successfully saved ${savedCount} data entries.`);
    } else if (savedCount > 0 && skippedCount > 0) {
      toast.success(`Saved ${savedCount} entries. Skipped ${skippedCount} duplicate entries.`);
    } else if (savedCount === 0 && skippedCount > 0) {
      toast.warning(`Skipped all ${skippedCount} entries as they already exist. Use 'Overwrite' option to update existing data.`);
    }
    
    return { savedCount, skippedCount };
  } catch (error) {
    console.error("Error saving ad data:", error);
    toast.error("Failed to save data. Please try again.");
    throw error;
  }
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

// Generate CSV template
export const generateCSVTemplate = (): string => {
  return csvHeaders.join(',');
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
