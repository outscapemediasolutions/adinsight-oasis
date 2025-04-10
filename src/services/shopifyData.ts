
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
  where,
  addDoc
} from "firebase/firestore";
import { format } from 'date-fns';

// Define the interface for Shopify order data
export interface ShopifyOrderData {
  id: string;
  orderId: string;
  name: string;
  email: string;
  financialStatus: string;
  paidAt: string | null;
  fulfillmentStatus: string;
  fulfilledAt: string | null;
  acceptsMarketing: boolean;
  currency: string;
  subtotal: number;
  shipping: number;
  taxes: number;
  total: number;
  discountCode: string;
  discountAmount: number;
  shippingMethod: string;
  createdAt: string;
  lineItems: Array<{
    quantity: number;
    name: string;
    price: number;
    compareAtPrice: number | null;
    sku: string;
    requiresShipping: boolean;
    taxable: boolean;
    fulfillmentStatus: string;
    discount: number;
  }>;
  billingAddress: {
    name: string;
    street: string;
    address1: string;
    address2: string;
    company: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    phone: string;
  };
  shippingAddress: {
    name: string;
    street: string;
    address1: string;
    address2: string;
    company: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    phone: string;
  };
  notes: string;
  noteAttributes: string;
  cancelledAt: string | null;
  paymentMethod: string;
  paymentReference: string;
  refundedAmount: number;
  vendor: string;
  outstandingBalance: number;
  employee: string;
  location: string;
  deviceId: string;
  tags: string;
  riskLevel: string;
  source: string;
  tax1Name: string;
  tax1Value: number;
  tax2Name: string;
  tax2Value: number;
  tax3Name: string;
  tax3Value: number;
  tax4Name: string;
  tax4Value: number;
  tax5Name: string;
  tax5Value: number;
  phone: string;
  receiptNumber: string;
  duties: number;
  billingProvinceName: string;
  shippingProvinceName: string;
  paymentId: string;
  paymentTermsName: string;
  nextPaymentDueAt: string | null;
  paymentReferences: string;
  uploadId: string;
  created: any;
}

export interface ShopifyUploadRecord {
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

// Get required Shopify CSV headers
export const getRequiredShopifyHeaders = () => {
  return [
    "Name", "Email", "Financial Status", "Paid at", "Fulfillment Status", 
    "Fulfilled at", "Accepts Marketing", "Currency", "Subtotal", "Shipping", 
    "Taxes", "Total", "Discount Code", "Discount Amount", "Shipping Method", 
    "Created at", "Lineitem quantity", "Lineitem name", "Lineitem price", 
    "Lineitem compare at price", "Lineitem sku", "Lineitem requires shipping", 
    "Lineitem taxable", "Lineitem fulfillment status", "Billing Name", 
    "Billing Street", "Billing Address1", "Billing Address2", "Billing Company", 
    "Billing City", "Billing Zip", "Billing Province", "Billing Country", 
    "Billing Phone", "Shipping Name", "Shipping Street", "Shipping Address1", 
    "Shipping Address2", "Shipping Company", "Shipping City", "Shipping Zip", 
    "Shipping Province", "Shipping Country", "Shipping Phone", "Notes", 
    "Note Attributes", "Cancelled at", "Payment Method", "Payment Reference", 
    "Refunded Amount", "Vendor", "Outstanding Balance", "Employee", "Location", 
    "Device ID", "Id", "Tags", "Risk Level", "Source", "Lineitem discount", 
    "Tax 1 Name", "Tax 1 Value", "Tax 2 Name", "Tax 2 Value", "Tax 3 Name", 
    "Tax 3 Value", "Tax 4 Name", "Tax 4 Value", "Tax 5 Name", "Tax 5 Value", 
    "Phone", "Receipt Number", "Duties", "Billing Province Name", 
    "Shipping Province Name", "Payment ID", "Payment Terms Name", 
    "Next Payment Due At", "Payment References"
  ];
};

// Validate Shopify CSV headers
export const validateShopifyCSVHeaders = (csvData: string) => {
  const requiredHeaders = getRequiredShopifyHeaders();
  
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

// Generate Shopify CSV template
export const generateShopifyCSVTemplate = () => {
  const headers = getRequiredShopifyHeaders();
  return headers.join(",") + "\n";
};

// Process and save Shopify CSV data
export const processAndSaveShopifyCSVData = async (
  userId: string, 
  fileName: string, 
  data: Record<string, string>[],
  columnMapping: Record<string, string> | null = null
) => {
  try {
    // Get a batch reference for batch operations
    const batch = writeBatch(db);
    const shopifyDataRef = collection(db, 'users', userId, 'shopify_data');
    const timestamp = Date.now();
    
    console.log(`Processing ${data.length} Shopify records for user ${userId}`);
    
    // Extract date range
    let minDate = '';
    let maxDate = '';
    
    data.forEach(row => {
      const createdAt = row['Created at'];
      if (createdAt) {
        if (!minDate || createdAt < minDate) minDate = createdAt;
        if (!maxDate || createdAt > maxDate) maxDate = createdAt;
      }
    });
    
    // Create a unique upload ID
    const uploadId = `shopify_upload_${timestamp}`;
    
    // Add each row to the batch
    data.forEach((row, index) => {
      const docRef = doc(shopifyDataRef, `${uploadId}_${index}`);
      
      // Transform CSV data into structured Shopify order data
      const transformedRow: ShopifyOrderData = {
        id: `${uploadId}_${index}`,
        orderId: row['Id'] || '',
        name: row['Name'] || '',
        email: row['Email'] || '',
        financialStatus: row['Financial Status'] || '',
        paidAt: row['Paid at'] || null,
        fulfillmentStatus: row['Fulfillment Status'] || '',
        fulfilledAt: row['Fulfilled at'] || null,
        acceptsMarketing: row['Accepts Marketing']?.toLowerCase() === 'yes' || false,
        currency: row['Currency'] || 'INR',
        subtotal: parseFloat(row['Subtotal']) || 0,
        shipping: parseFloat(row['Shipping']) || 0,
        taxes: parseFloat(row['Taxes']) || 0,
        total: parseFloat(row['Total']) || 0,
        discountCode: row['Discount Code'] || '',
        discountAmount: parseFloat(row['Discount Amount']) || 0,
        shippingMethod: row['Shipping Method'] || '',
        createdAt: row['Created at'] || '',
        lineItems: [{
          quantity: parseInt(row['Lineitem quantity']) || 0,
          name: row['Lineitem name'] || '',
          price: parseFloat(row['Lineitem price']) || 0,
          compareAtPrice: parseFloat(row['Lineitem compare at price']) || null,
          sku: row['Lineitem sku'] || '',
          requiresShipping: row['Lineitem requires shipping']?.toLowerCase() === 'true' || false,
          taxable: row['Lineitem taxable']?.toLowerCase() === 'true' || false,
          fulfillmentStatus: row['Lineitem fulfillment status'] || '',
          discount: parseFloat(row['Lineitem discount']) || 0
        }],
        billingAddress: {
          name: row['Billing Name'] || '',
          street: row['Billing Street'] || '',
          address1: row['Billing Address1'] || '',
          address2: row['Billing Address2'] || '',
          company: row['Billing Company'] || '',
          city: row['Billing City'] || '',
          zip: row['Billing Zip'] || '',
          province: row['Billing Province'] || '',
          country: row['Billing Country'] || '',
          phone: row['Billing Phone'] || ''
        },
        shippingAddress: {
          name: row['Shipping Name'] || '',
          street: row['Shipping Street'] || '',
          address1: row['Shipping Address1'] || '',
          address2: row['Shipping Address2'] || '',
          company: row['Shipping Company'] || '',
          city: row['Shipping City'] || '',
          zip: row['Shipping Zip'] || '',
          province: row['Shipping Province'] || '',
          country: row['Shipping Country'] || '',
          phone: row['Shipping Phone'] || ''
        },
        notes: row['Notes'] || '',
        noteAttributes: row['Note Attributes'] || '',
        cancelledAt: row['Cancelled at'] || null,
        paymentMethod: row['Payment Method'] || '',
        paymentReference: row['Payment Reference'] || '',
        refundedAmount: parseFloat(row['Refunded Amount']) || 0,
        vendor: row['Vendor'] || '',
        outstandingBalance: parseFloat(row['Outstanding Balance']) || 0,
        employee: row['Employee'] || '',
        location: row['Location'] || '',
        deviceId: row['Device ID'] || '',
        tags: row['Tags'] || '',
        riskLevel: row['Risk Level'] || '',
        source: row['Source'] || '',
        tax1Name: row['Tax 1 Name'] || '',
        tax1Value: parseFloat(row['Tax 1 Value']) || 0,
        tax2Name: row['Tax 2 Name'] || '',
        tax2Value: parseFloat(row['Tax 2 Value']) || 0,
        tax3Name: row['Tax 3 Name'] || '',
        tax3Value: parseFloat(row['Tax 3 Value']) || 0,
        tax4Name: row['Tax 4 Name'] || '',
        tax4Value: parseFloat(row['Tax 4 Value']) || 0,
        tax5Name: row['Tax 5 Name'] || '',
        tax5Value: parseFloat(row['Tax 5 Value']) || 0,
        phone: row['Phone'] || '',
        receiptNumber: row['Receipt Number'] || '',
        duties: parseFloat(row['Duties']) || 0,
        billingProvinceName: row['Billing Province Name'] || '',
        shippingProvinceName: row['Shipping Province Name'] || '',
        paymentId: row['Payment ID'] || '',
        paymentTermsName: row['Payment Terms Name'] || '',
        nextPaymentDueAt: row['Next Payment Due At'] || null,
        paymentReferences: row['Payment References'] || '',
        uploadId,
        created: serverTimestamp()
      };
      
      batch.set(docRef, transformedRow);
    });
    
    // Prepare upload history document data
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
      columnMapping: columnMapping || null,
      created: serverTimestamp()
    };
    
    // Save upload info to shopify_upload_history collection
    const uploadHistoryRef = doc(collection(db, 'users', userId, 'shopify_upload_history'), uploadId);
    batch.set(uploadHistoryRef, uploadHistoryData);
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully saved ${data.length} Shopify records and upload history`);
    
    return { success: true, uploadId };
  } catch (error) {
    console.error("Error saving Shopify CSV data:", error);
    throw new Error(`Error saving Shopify CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get Shopify order data
export const getShopifyOrderData = async (userId: string, filters: any = {}): Promise<ShopifyOrderData[]> => {
  try {
    const shopifyDataRef = collection(db, 'users', userId, 'shopify_data');
    let q = query(shopifyDataRef);
    
    // Apply filters
    if (filters.startDate && filters.endDate) {
      console.log(`Filtering orders from ${filters.startDate} to ${filters.endDate}`);
      q = query(q, where('createdAt', '>=', filters.startDate), where('createdAt', '<=', filters.endDate));
    }

    if (filters.uploadId) {
      q = query(q, where('uploadId', '==', filters.uploadId));
    }
    
    if (filters.paymentMethod) {
      q = query(q, where('paymentMethod', '==', filters.paymentMethod));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No matching Shopify orders.");
      return [];
    }
    
    const shopifyData: ShopifyOrderData[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as ShopifyOrderData;
      shopifyData.push(data);
    });
    
    console.log(`Retrieved ${shopifyData.length} Shopify orders`);
    return shopifyData;
  } catch (error) {
    console.error("Error getting Shopify order data:", error);
    throw new Error(`Error getting Shopify order data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get user Shopify upload history
export const getUserShopifyUploads = async (userId: string): Promise<ShopifyUploadRecord[]> => {
  try {
    const uploadsRef = collection(db, 'users', userId, 'shopify_upload_history');
    const q = query(
      uploadsRef,
      orderBy('uploadedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No Shopify upload history found for user");
      return [];
    }
    
    const uploads: ShopifyUploadRecord[] = [];
    
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
    
    console.log(`Found ${uploads.length} Shopify upload records`);
    return uploads;
  } catch (error) {
    console.error("Error fetching Shopify upload history:", error);
    throw new Error(`Error fetching Shopify upload history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Delete Shopify upload and its data
export const deleteShopifyUpload = async (userId: string, uploadId: string): Promise<boolean> => {
  try {
    // Delete shopify data associated with the upload
    const shopifyDataRef = collection(db, 'users', userId, 'shopify_data');
    const q = query(shopifyDataRef, where('uploadId', '==', uploadId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete upload history record
    const uploadHistoryRef = doc(db, 'users', userId, 'shopify_upload_history', uploadId);
    batch.delete(uploadHistoryRef);
    
    await batch.commit();
    
    console.log(`Successfully deleted Shopify upload ${uploadId} and associated data`);
    return true;
  } catch (error) {
    console.error("Error deleting Shopify upload:", error);
    throw new Error(`Error deleting Shopify upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Calculate Shopify metrics
export const calculateShopifyMetrics = (orders: ShopifyOrderData[]) => {
  console.log(`Calculating metrics for ${orders.length} Shopify orders`);
  
  if (orders.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalDiscounts: 0,
      fulfillmentRate: 0,
      paymentMethodBreakdown: {},
      regionBreakdown: {},
      deviceBreakdown: {}
    };
  }
  
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let totalDiscounts = 0;
  let fulfilledOrders = 0;
  const paymentMethods: Record<string, number> = {};
  const regions: Record<string, number> = {};
  const devices: Record<string, number> = {};
  
  orders.forEach(order => {
    totalRevenue += order.total || 0;
    totalDiscounts += order.discountAmount || 0;
    
    // Count fulfilled orders
    if (order.fulfillmentStatus === 'fulfilled') {
      fulfilledOrders++;
    }
    
    // Count payment methods
    const paymentMethod = order.paymentMethod || 'Other';
    paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + 1;
    
    // Count regions (shipping province)
    const region = order.shippingProvinceName || order.shippingAddress.province || 'Unknown';
    regions[region] = (regions[region] || 0) + 1;
    
    // Extract device from notes (user agent)
    let device = 'Unknown';
    if (order.notes && order.notes.includes('user-agent:')) {
      const userAgent = order.notes.toLowerCase();
      if (userAgent.includes('android')) device = 'Android';
      else if (userAgent.includes('iphone') || userAgent.includes('ipad')) device = 'iOS';
      else if (userAgent.includes('windows')) device = 'Windows';
      else if (userAgent.includes('macintosh')) device = 'Mac';
      else device = 'Other';
    }
    devices[device] = (devices[device] || 0) + 1;
  });
  
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 0;
  
  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalDiscounts,
    fulfillmentRate,
    paymentMethodBreakdown: paymentMethods,
    regionBreakdown: regions,
    deviceBreakdown: devices
  };
};

// Get product performance
export const getProductPerformance = (orders: ShopifyOrderData[]) => {
  const productMap: Record<string, { 
    name: string, 
    quantity: number, 
    revenue: number, 
    orders: number 
  }> = {};
  
  orders.forEach(order => {
    order.lineItems.forEach(item => {
      const productName = item.name;
      if (!productMap[productName]) {
        productMap[productName] = { 
          name: productName, 
          quantity: 0, 
          revenue: 0, 
          orders: 0 
        };
      }
      
      productMap[productName].quantity += item.quantity;
      productMap[productName].revenue += item.price * item.quantity;
      productMap[productName].orders += 1;
    });
  });
  
  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue);
};

// Group orders by date for trend analysis
export const groupOrdersByDate = (orders: ShopifyOrderData[]) => {
  const dateMap: Record<string, { 
    date: string, 
    count: number, 
    revenue: number, 
    discounts: number 
  }> = {};
  
  // Sort orders by date
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  sortedOrders.forEach(order => {
    // Format date to YYYY-MM-DD
    const date = order.createdAt.split('T')[0];
    
    if (!dateMap[date]) {
      dateMap[date] = {
        date,
        count: 0,
        revenue: 0,
        discounts: 0
      };
    }
    
    dateMap[date].count += 1;
    dateMap[date].revenue += order.total;
    dateMap[date].discounts += order.discountAmount;
  });
  
  return Object.values(dateMap);
};
