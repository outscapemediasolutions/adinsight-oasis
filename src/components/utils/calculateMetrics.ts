
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
  
  // 1. Order Volume and Revenue
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.orderTotal, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalDiscounts = orders.reduce((sum, order) => sum + order.discountValue, 0);
  const discountPercentage = totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0;
  
  // 2. Order Status Distribution
  const statusData: Record<string, number> = {};
  orders.forEach(order => {
    const status = order.status || "Unknown";
    statusData[status] = (statusData[status] || 0) + 1;
  });
  
  // 3. Payment Method Distribution
  const paymentData: Record<string, number> = {};
  orders.forEach(order => {
    const method = order.paymentMethod || "Unknown";
    paymentData[method] = (paymentData[method] || 0) + 1;
  });
  
  // 4. Geographic Distribution
  const stateData: Record<string, number> = {};
  orders.forEach(order => {
    const state = order.addressState || "Unknown";
    stateData[state] = (stateData[state] || 0) + 1;
  });
  
  // 5. Courier Performance
  const courierData: Record<string, { total: number, delivered: number, rto: number, totalCharges: number }> = {};
  orders.forEach(order => {
    const courier = order.courierCompany || "Unknown";
    if (!courierData[courier]) {
      courierData[courier] = { total: 0, delivered: 0, rto: 0, totalCharges: 0 };
    }
    courierData[courier].total += 1;
    courierData[courier].totalCharges += order.freightTotalAmount;
    
    if (order.status && order.status.toUpperCase().includes("DELIVER")) {
      courierData[courier].delivered += 1;
    } else if (order.status && order.status.toUpperCase().includes("RTO")) {
      courierData[courier].rto += 1;
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
  
  // 6. Weight Analysis
  const weightDiscrepancy = orders.reduce((sum, order) => {
    return sum + (order.chargedWeight - order.weight);
  }, 0) / (orders.length || 1);
  
  // 7. COD Analysis
  const codOrders = orders.filter(order => order.paymentMethod && order.paymentMethod.toUpperCase().includes("COD"));
  const totalCodAmount = codOrders.reduce((sum, order) => sum + order.codPayableAmount, 0);
  const totalRemitted = codOrders.reduce((sum, order) => sum + order.remittedAmount, 0);
  const codCollectionRate = totalCodAmount > 0 ? (totalRemitted / totalCodAmount) * 100 : 0;
  const avgCodCharges = codOrders.length > 0 
    ? codOrders.reduce((sum, order) => sum + order.codCharges, 0) / codOrders.length
    : 0;
  
  // 8. Product Analysis
  const productData: Record<string, { quantity: number, revenue: number }> = {};
  orders.forEach(order => {
    const product = order.productName || "Unknown";
    if (!productData[product]) {
      productData[product] = { quantity: 0, revenue: 0 };
    }
    productData[product].quantity += order.productQuantity;
    productData[product].revenue += order.orderTotal;
  });
  
  // Get top products
  const topProducts = Object.entries(productData)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // 9. Order Volume by Date
  const ordersByDate: Record<string, { date: string, orders: number, revenue: number }> = {};
  orders.forEach(order => {
    // Ensure we have a valid date object
    if (!(order.shipDate instanceof Date) || isNaN(order.shipDate.getTime())) {
      return;
    }
    
    const dateStr = format(order.shipDate, 'yyyy-MM-dd');
    
    if (!ordersByDate[dateStr]) {
      ordersByDate[dateStr] = {
        date: dateStr,
        orders: 0,
        revenue: 0
      };
    }
    
    ordersByDate[dateStr].orders += 1;
    ordersByDate[dateStr].revenue += order.orderTotal;
  });
  
  const orderVolumeByDate = Object.values(ordersByDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // 10. Customer Analysis
  const customerData: Record<string, number> = {};
  orders.forEach(order => {
    if (order.customerEmail) {
      customerData[order.customerEmail] = (customerData[order.customerEmail] || 0) + 1;
    }
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
