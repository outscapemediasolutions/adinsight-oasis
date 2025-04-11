import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { RefreshCw, Upload, RotateCcw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import EmptyState from "./EmptyState";
import { ShopifyAnalyticsSummary } from "./ShopifyAnalyticsSummary";
import { ShopifyCharts } from "./charts/ShopifyCharts";

interface ShopifyDashboardProps {
  dateRange: { start?: Date; end?: Date };
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  total: number;
  subtotal: number;
  shipping: number;
  taxes: number;
  discountAmount: number;
  createdAt: Date;
  financialStatus: string;
  fulfillmentStatus: string;
  lineItems: Array<{
    name: string;
    price: number;
    quantity: number;
    sku: string;
  }>;
}

const ShopifyDashboard = ({ dateRange }: ShopifyDashboardProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [hasData, setHasData] = useState(false);
  
  useEffect(() => {
    if (!currentUser) return;
    
    fetchShopifyData();
  }, [currentUser, dateRange]);
  
  const fetchShopifyData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const shopifyDataRef = collection(db, "users", currentUser.uid, "shopifyData");
      
      // First check if any data exists overall
      const checkDataQuery = query(shopifyDataRef, limit(1));
      const checkSnapshot = await getDocs(checkDataQuery);
      setHasData(!checkSnapshot.empty);
      
      // Build query with optional date filters
      let q = query(shopifyDataRef, orderBy("createdAt", "desc"));
      
      if (dateRange.start && dateRange.end) {
        q = query(
          shopifyDataRef,
          where("createdAt", ">=", dateRange.start),
          where("createdAt", "<=", dateRange.end),
          orderBy("createdAt", "desc")
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
      const processedOrders: ShopifyOrder[] = [];
      const orderMap: Record<string, ShopifyOrder> = {};
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const orderId = data["Id"] || data["Order ID"] || doc.id;
        
        // Convert numeric strings to numbers
        const total = parseFloat(data["Total"] || "0");
        const subtotal = parseFloat(data["Subtotal"] || "0");
        const shipping = parseFloat(data["Shipping"] || "0");
        const taxes = parseFloat(data["Taxes"] || "0");
        const discountAmount = parseFloat(data["Discount Amount"] || "0");
        
        // Parse date
        let createdAt: Date;
        try {
          createdAt = data.createdAt instanceof Date 
            ? data.createdAt 
            : new Date(data["Created at"] || Date.now());
        } catch (e) {
          createdAt = new Date();
        }
        
        // Create or update order
        if (!orderMap[orderId]) {
          orderMap[orderId] = {
            id: orderId,
            name: data["Name"] || "Unknown",
            email: data["Email"] || "",
            total,
            subtotal,
            shipping,
            taxes,
            discountAmount,
            createdAt,
            financialStatus: data["Financial Status"] || "",
            fulfillmentStatus: data["Fulfillment Status"] || "",
            lineItems: []
          };
        }
        
        // Add line item if this record has one
        if (data["Lineitem name"]) {
          orderMap[orderId].lineItems.push({
            name: data["Lineitem name"] || "",
            price: parseFloat(data["Lineitem price"] || "0"),
            quantity: parseInt(data["Lineitem quantity"] || "1", 10),
            sku: data["Lineitem sku"] || ""
          });
        }
      });
      
      // Convert map to array
      Object.values(orderMap).forEach(order => {
        processedOrders.push(order);
      });
      
      setOrders(processedOrders);
      
      // Calculate metrics
      const totalRevenue = processedOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = processedOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Count unique customers
      const uniqueCustomers = new Set(processedOrders.map(order => order.email)).size;
      
      // Calculate products sold
      const productsSold = processedOrders.reduce((sum, order) => {
        return sum + order.lineItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);
      
      // Get top products
      const productMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
      processedOrders.forEach(order => {
        order.lineItems.forEach(item => {
          if (!productMap[item.sku || item.name]) {
            productMap[item.sku || item.name] = {
              name: item.name,
              quantity: 0,
              revenue: 0
            };
          }
          productMap[item.sku || item.name].quantity += item.quantity;
          productMap[item.sku || item.name].revenue += item.price * item.quantity;
        });
      });
      
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      
      // Get sales by day
      const salesByDay: Record<string, { date: string, orders: number, revenue: number }> = {};
      
      processedOrders.forEach(order => {
        const dateStr = format(order.createdAt, 'yyyy-MM-dd');
        
        if (!salesByDay[dateStr]) {
          salesByDay[dateStr] = {
            date: dateStr,
            orders: 0,
            revenue: 0
          };
        }
        
        salesByDay[dateStr].orders += 1;
        salesByDay[dateStr].revenue += order.total;
      });
      
      const salesByDayArray = Object.values(salesByDay)
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setMetrics({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        uniqueCustomers,
        productsSold,
        topProducts,
        salesByDay: salesByDayArray
      });
    } catch (error) {
      console.error("Error fetching Shopify data:", error);
      toast.error("Failed to load Shopify data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchShopifyData();
  };
  
  const handleUploadClick = () => {
    // Navigate to /shopify-analytics with a state indicating to open the upload tab
    navigate("/shopify-analytics", { 
      state: { defaultTab: "upload" } 
    });
  };
  
  const handleResetDateRange = () => {
    // Navigate to the same page but without date filters
    navigate("/shopify-analytics");
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
          <h3 className="text-lg font-medium mb-2">No Shopify data available</h3>
          <p className="text-muted-foreground mb-4">Upload your Shopify sales report to see insights and analytics</p>
          <Button onClick={handleUploadClick} className="bg-adpulse-green hover:bg-adpulse-green/90">
            <Upload className="mr-2 h-4 w-4" />
            Upload Shopify Data
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
      
      <ShopifyAnalyticsSummary metrics={metrics} isLoading={isLoading} />
      
      <ShopifyCharts metrics={metrics} isLoading={isLoading} />
    </div>
  );
};

export default ShopifyDashboard;
