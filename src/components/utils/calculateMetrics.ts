import { ShippingOrder } from "../ShippingDashboard";
import { format } from "date-fns";

export interface ShippingMetrics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  discountPercentage: number;
  statusDistribution: Array<{ name: string; value: number }>;
  paymentDistribution: Array<{ name: string; value: number }>;
  geographicDistribution: Array<{ name: string; value: number }>;
  courierPerformance: Array<{
    name: string;
    deliveryRate: number;
    rtoRate: number;
    avgCost: number;
    total: number;
  }>;
  weightDiscrepancy: number;
  codAnalysis: {
    totalCodAmount: number;
    totalRemitted: number;
    codCollectionRate: number;
    avgCodCharges: number;
    codOrdersCount: number;
  };
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  orderVolumeByDate: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  customerAnalysis: {
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
  };
}

export const calculateMetrics = (orders: ShippingOrder[]): ShippingMetrics => {
  console.log("Calculating metrics from", orders.length, "orders");
  
  // Filter orders to only include those with tracking IDs
  const validOrders = orders.filter(order => order.trackingId && order.trackingId.trim() !== '');
  console.log(`Filtered ${validOrders.length} orders with valid tracking IDs from ${orders.length} total orders`);
  
  // If no valid orders, return empty metrics
  if (validOrders.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      discountPercentage: 0,
      statusDistribution: [],
      paymentDistribution: [],
      geographicDistribution: [],
      courierPerformance: [],
      weightDiscrepancy: 0,
      codAnalysis: {
        totalCodAmount: 0,
        totalRemitted: 0,
        codCollectionRate: 0,
        avgCodCharges: 0,
        codOrdersCount: 0
      },
      topProducts: [],
      orderVolumeByDate: [],
      customerAnalysis: {
        uniqueCustomers: 0,
        repeatCustomers: 0,
        repeatRate: 0
      }
    };
  }
  
  // 1. Order Volume and Revenue
  const totalOrders = validOrders.length;
  const totalRevenue = validOrders.reduce((sum, order) => {
    const orderTotal = typeof order.orderTotal === 'number' 
      ? order.orderTotal 
      : parseFloat(order.orderTotal as string) || 0;
    return sum + orderTotal;
  }, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const totalDiscounts = validOrders.reduce((sum, order) => {
    const discountValue = typeof order.discountValue === 'number' 
      ? order.discountValue 
      : parseFloat(order.discountValue as string) || 0;
    return sum + discountValue;
  }, 0);
  
  const discountPercentage = totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0;
  
  // 2. Order Status Distribution - handle empty/null values
  const statusData: Record<string, number> = {};
  validOrders.forEach(order => {
    const status = order.status && typeof order.status === 'string' && order.status.trim() !== '' 
      ? order.status 
      : "Unknown";
    statusData[status] = (statusData[status] || 0) + 1;
  });
  
  // 3. Payment Method Distribution - handle empty/null values
  const paymentData: Record<string, number> = {};
  validOrders.forEach(order => {
    const method = order.paymentMethod && typeof order.paymentMethod === 'string' && order.paymentMethod.trim() !== '' 
      ? order.paymentMethod 
      : "Unknown";
    paymentData[method] = (paymentData[method] || 0) + 1;
  });
  
  // 4. Geographic Distribution - handle empty/null values
  const stateData: Record<string, number> = {};
  validOrders.forEach(order => {
    const state = order.addressState && typeof order.addressState === 'string' && order.addressState.trim() !== '' 
      ? order.addressState 
      : "Unknown";
    stateData[state] = (stateData[state] || 0) + 1;
  });
  
  // 5. Courier Performance - handle empty/null values
  const courierData: Record<string, { total: number, delivered: number, rto: number, totalCharges: number }> = {};
  validOrders.forEach(order => {
    const courier = order.courierCompany && typeof order.courierCompany === 'string' && order.courierCompany.trim() !== '' 
      ? order.courierCompany 
      : "Unknown";
    
    if (!courierData[courier]) {
      courierData[courier] = { total: 0, delivered: 0, rto: 0, totalCharges: 0 };
    }
    courierData[courier].total += 1;
    
    const freightTotal = typeof order.freightTotalAmount === 'number' 
      ? order.freightTotalAmount 
      : parseFloat(order.freightTotalAmount as string) || 0;
    
    courierData[courier].totalCharges += freightTotal;
    
    if (order.status && typeof order.status === 'string') {
      const status = order.status.toUpperCase();
      if (status.includes("DELIVER") || status.includes("COMPLETED")) {
        courierData[courier].delivered += 1;
      } else if (status.includes("RTO") || status.includes("RETURN")) {
        courierData[courier].rto += 1;
      }
    }
  });
  
  // Calculate delivery rate and average cost
  const courierPerformance = Object.entries(courierData).map(([name, data]) => ({
    name,
    deliveryRate: data.total > 0 ? (data.delivered / data.total) * 100 : 0,
    rtoRate: data.total > 0 ? (data.rto / data.total) * 100 : 0,
    avgCost: data.total > 0 ? data.totalCharges / data.total : 0,
    total: data.total
  }));
  
  // 6. Weight Analysis - handle type conversions
  const weightDiscrepancy = validOrders.reduce((sum, order) => {
    const chargedWeight = typeof order.chargedWeight === 'number' 
      ? order.chargedWeight 
      : parseFloat(order.chargedWeight as string) || 0;
    
    const actualWeight = typeof order.weight === 'number' 
      ? order.weight 
      : parseFloat(order.weight as string) || 0;
    
    return sum + (chargedWeight - actualWeight);
  }, 0) / (validOrders.length || 1);
  
  // 7. COD Analysis - handle type conversions and empty/null values
  const codOrders = validOrders.filter(order => 
    order.paymentMethod && 
    typeof order.paymentMethod === 'string' && 
    order.paymentMethod.toUpperCase().includes("COD")
  );
  
  const totalCodAmount = codOrders.reduce((sum, order) => {
    const codAmount = typeof order.codPayableAmount === 'number' 
      ? order.codPayableAmount 
      : parseFloat(order.codPayableAmount as string) || 0;
    return sum + codAmount;
  }, 0);
  
  const totalRemitted = codOrders.reduce((sum, order) => {
    const remitted = typeof order.remittedAmount === 'number' 
      ? order.remittedAmount 
      : parseFloat(order.remittedAmount as string) || 0;
    return sum + remitted;
  }, 0);
  
  const codCollectionRate = totalCodAmount > 0 ? (totalRemitted / totalCodAmount) * 100 : 0;
  
  const avgCodCharges = codOrders.length > 0 
    ? codOrders.reduce((sum, order) => {
        const codCharges = typeof order.codCharges === 'number' 
          ? order.codCharges 
          : parseFloat(order.codCharges as string) || 0;
        return sum + codCharges;
      }, 0) / codOrders.length
    : 0;
  
  // 8. Product Analysis - handle empty/null values
  const productData: Record<string, { quantity: number, revenue: number }> = {};
  validOrders.forEach(order => {
    const product = order.productName && typeof order.productName === 'string' && order.productName.trim() !== '' 
      ? order.productName 
      : "Unknown";
    
    if (!productData[product]) {
      productData[product] = { quantity: 0, revenue: 0 };
    }
    
    const quantity = typeof order.productQuantity === 'number' 
      ? order.productQuantity 
      : parseInt(order.productQuantity as string, 10) || 1;
    
    const orderTotal = typeof order.orderTotal === 'number' 
      ? order.orderTotal 
      : parseFloat(order.orderTotal as string) || 0;
    
    productData[product].quantity += quantity;
    productData[product].revenue += orderTotal;
  });
  
  // Get top products
  const topProducts = Object.entries(productData)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // 9. Order Volume by Date - handle date conversion and ensure valid dates
  const ordersByDate: Record<string, { date: string, orders: number, revenue: number }> = {};
  validOrders.forEach(order => {
    // Handle different date formats and types
    let dateObj: Date | null = null;
    
    if (order.shipDate) {
      if (order.shipDate instanceof Date) {
        dateObj = order.shipDate;
      } else if (typeof order.shipDate === 'object' && order.shipDate !== null && 'toDate' in order.shipDate && typeof (order.shipDate as any).toDate === 'function') {
        // Handle Firestore Timestamp objects
        dateObj = (order.shipDate as any).toDate();
      } else if (typeof order.shipDate === 'string') {
        // Try parsing string date
        dateObj = new Date(order.shipDate);
      } else if (typeof order.shipDate === 'number') {
        // Handle numeric timestamp
        dateObj = new Date(order.shipDate);
      }
    }
    
    // Skip if we couldn't parse a valid date
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn("Invalid date for order:", order);
      return;
    }
    
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    
    if (!ordersByDate[dateStr]) {
      ordersByDate[dateStr] = {
        date: dateStr,
        orders: 0,
        revenue: 0
      };
    }
    
    ordersByDate[dateStr].orders += 1;
    
    const orderTotal = typeof order.orderTotal === 'number' 
      ? order.orderTotal 
      : parseFloat(order.orderTotal as string) || 0;
    
    ordersByDate[dateStr].revenue += orderTotal;
  });
  
  const orderVolumeByDate = Object.values(ordersByDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // 10. Customer Analysis - handle empty/null values
  const customerData: Record<string, number> = {};
  validOrders.forEach(order => {
    let customerKey = "Unknown";
    
    if (order.customerEmail && typeof order.customerEmail === 'string' && order.customerEmail.trim() !== '') {
      customerKey = order.customerEmail;
    } else if (order.customerMobile && typeof order.customerMobile === 'string' && order.customerMobile.trim() !== '') {
      customerKey = order.customerMobile;
    } else if (order.customerName && typeof order.customerName === 'string' && order.customerName.trim() !== '') {
      customerKey = order.customerName;
    }
    
    customerData[customerKey] = (customerData[customerKey] || 0) + 1;
  });
  
  const uniqueCustomers = Object.keys(customerData).length;
  const repeatCustomers = Object.values(customerData).filter(count => count > 1).length;
  const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
  
  // Return metrics
  return {
    totalOrders,
    totalRevenue,
    avgOrderValue,
    discountPercentage,
    statusDistribution: Object.entries(statusData).map(([name, value]) => ({ name, value })),
    paymentDistribution: Object.entries(paymentData).map(([name, value]) => ({ name, value })),
    geographicDistribution: Object.entries(stateData).map(([name, value]) => ({ name, value })),
    courierPerformance,
    weightDiscrepancy,
    codAnalysis: {
      totalCodAmount,
      totalRemitted,
      codCollectionRate,
      avgCodCharges,
      codOrdersCount: codOrders.length
    },
    topProducts,
    orderVolumeByDate,
    customerAnalysis: {
      uniqueCustomers,
      repeatCustomers,
      repeatRate
    }
  };
};
