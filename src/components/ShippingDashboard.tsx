
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { RefreshCw, Upload, RotateCcw, Package, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ShippingAnalyticsSummary } from "./ShippingAnalyticsSummary";
import { ShippingCharts } from "./charts/ShippingCharts";

interface ShippingDashboardProps {
  dateRange: { start?: Date; end?: Date };
}

export interface ShippingOrder {
  id: string;
  orderId: string;
  trackingId: string;
  shipDate: Date;
  status: string;
  productName: string;
  productCategory: string;
  productQuantity: number;
  customerName: string;
  customerEmail: string;
  addressState: string;
  addressCity: string;
  paymentMethod: string;
  orderTotal: number;
  discountValue: number;
  weight: number;
  chargedWeight: number;
  courierCompany: string;
  codPayableAmount: number;
  remittedAmount: number;
  codCharges: number;
  shippingCharges: number;
  freightTotalAmount: number;
}

const ShippingDashboard = ({ dateRange }: ShippingDashboardProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [hasData, setHasData] = useState(false);
  
  useEffect(() => {
    if (!currentUser) return;
    
    fetchShippingData();
  }, [currentUser, dateRange]);
  
  const fetchShippingData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const shippingDataRef = collection(db, "users", currentUser.uid, "shippingData");
      
      // First check if any data exists overall
      const checkDataQuery = query(shippingDataRef, limit(1));
      const checkSnapshot = await getDocs(checkDataQuery);
      setHasData(!checkSnapshot.empty);
      
      // Build query with optional date filters
      let q = query(shippingDataRef, orderBy("shipDate", "desc"));
      
      if (dateRange.start && dateRange.end) {
        q = query(
          shippingDataRef,
          where("shipDate", ">=", dateRange.start),
          where("shipDate", "<=", dateRange.end),
          orderBy("shipDate", "desc")
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setOrders([]);
        setMetrics(null);
        setIsLoading(false);
        return;
      }
      
      // Process orders
      const processedOrders: ShippingOrder[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        
        // Convert date strings to Date objects
        let shipDate: Date;
        try {
          shipDate = data.shipDate instanceof Date 
            ? data.shipDate 
            : new Date(data["Ship Date"] || Date.now());
        } catch (e) {
          shipDate = new Date();
        }
        
        // Create order object
        const order: ShippingOrder = {
          id: doc.id,
          orderId: data["Order ID"] || "",
          trackingId: data["Tracking ID"] || "",
          shipDate,
          status: data["Status"] || "",
          productName: data["Product Name"] || "",
          productCategory: data["Product Category"] || "",
          productQuantity: parseInt(data["Product Quantity"] || "0"),
          customerName: data["Customer Name"] || "",
          customerEmail: data["Customer Email"] || "",
          addressState: data["Address State"] || "",
          addressCity: data["Address City"] || "",
          paymentMethod: data["Payment Method"] || "",
          orderTotal: parseFloat(data["Order Total"] || "0"),
          discountValue: parseFloat(data["Discount Value"] || "0"),
          weight: parseFloat(data["Weight (KG)"] || "0"),
          chargedWeight: parseFloat(data["Charged Weight"] || "0"),
          courierCompany: data["Courier Company"] || "",
          codPayableAmount: parseFloat(data["COD Payble Amount"] || "0"),
          remittedAmount: parseFloat(data["Remitted Amount"] || "0"),
          codCharges: parseFloat(data["COD Charges"] || "0"),
          shippingCharges: parseFloat(data["Shipping Charges"] || "0"),
          freightTotalAmount: parseFloat(data["Freight Total Amount"] || "0")
        };
        
        processedOrders.push(order);
      });
      
      setOrders(processedOrders);
      
      // Calculate metrics
      calculateMetrics(processedOrders);
      
    } catch (error) {
      console.error("Error fetching shipping data:", error);
      toast.error("Failed to load shipping data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const calculateMetrics = (orders: ShippingOrder[]) => {
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
      
      if (order.status.toUpperCase().includes("DELIVER")) {
        courierData[courier].delivered += 1;
      } else if (order.status.toUpperCase().includes("RTO")) {
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
    const codOrders = orders.filter(order => order.paymentMethod.toUpperCase().includes("COD"));
    const totalCodAmount = codOrders.reduce((sum, order) => sum + order.codPayableAmount, 0);
    const totalRemitted = codOrders.reduce((sum, order) => sum + order.remittedAmount, 0);
    const codCollectionRate = totalCodAmount > 0 ? (totalRemitted / totalCodAmount) * 100 : 0;
    const avgCodCharges = codOrders.length > 0 
      ? codOrders.reduce((sum, order) => sum + order.codCharges, 0) / codOrders.length
      : 0;
    
    // 8. Product Analysis
    const productData: Record<string, { quantity: number, revenue: number }> = {};
    orders.forEach(order => {
      const product = order.productName;
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
    
    // Set metrics
    setMetrics({
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
    });
  };

  const handleRefresh = () => {
    fetchShippingData();
  };
  
  const handleUploadClick = () => {
    navigate("/shipping-analytics", { 
      state: { defaultTab: "upload" } 
    });
  };
  
  const handleResetDateRange = () => {
    navigate("/shipping-analytics");
  };
  
  if (!isLoading && orders.length === 0) {
    // Handle different empty state scenarios
    if (hasData && dateRange.start && dateRange.end) {
      // If we have data overall but none in the selected date range
      return (
        <Card className="p-8 text-center border border-muted/20 bg-card/90 backdrop-blur-sm">
          <h3 className="text-lg font-medium mb-2">No data available for the selected date range</h3>
          <p className="text-muted-foreground mb-4">Try selecting a different date range or reset to view all data</p>
          <Button onClick={handleResetDateRange} className="bg-white/10 hover:bg-white/20 text-white">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Date Range
          </Button>
        </Card>
      );
    } else if (!hasData) {
      // If no data at all, show upload button
      return (
        <Card className="p-8 text-center border border-muted/20 bg-card/90 backdrop-blur-sm">
          <h3 className="text-lg font-medium mb-2">No shipping data available</h3>
          <p className="text-muted-foreground mb-4">Upload your shipping data to see insights and analytics</p>
          <Button onClick={handleUploadClick} className="bg-[#9b87f5] hover:bg-[#7E69AB]">
            <Upload className="mr-2 h-4 w-4" />
            Upload Shipping Data
          </Button>
        </Card>
      );
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      
      <ShippingAnalyticsSummary metrics={metrics} isLoading={isLoading} />
      
      <ShippingCharts metrics={metrics} isLoading={isLoading} />
    </div>
  );
};

export default ShippingDashboard;
