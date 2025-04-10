
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getShopifyOrderData, 
  calculateShopifyMetrics, 
  getProductPerformance,
  ShopifyOrderData
} from "@/services/shopifyData";
import { Calendar, Download, FilterX, RefreshCw, Upload, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import DateRangeSelector from "@/components/DateRangeSelector";
import { format } from "date-fns";
import EmptyState from "@/components/EmptyState";
import ShopifyCSVUpload from "@/components/ShopifyCSVUpload";
import ShopifyUploadHistory from "@/components/ShopifyUploadHistory";
import {
  OrdersByRegionChart,
  PaymentMethodChart,
  DeviceUsageChart,
  TopProductsChart,
  RevenueOverTimeChart,
  FulfillmentSpeedChart
} from "@/components/charts/ShopifyCharts";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  percentage?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  percentage,
  isLoading = false
}) => (
  <Card className="bg-[#0B2537] border-white/10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-8 w-8 rounded-full bg-[#021627] flex items-center justify-center text-adpulse-green">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="h-7 w-24 bg-white/10 animate-pulse rounded"></div>
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      <p className="text-xs text-white/60 mt-1">{description}</p>
      {!isLoading && trend && percentage && (
        <div className="flex items-center pt-1">
          <span className={`text-xs ${
            trend === "up" ? "text-adpulse-green" : 
            trend === "down" ? "text-red-500" : ""
          }`}>
            {percentage}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

interface ShopifyProductTableProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

const ShopifyProductTable: React.FC<ShopifyProductTableProps> = ({ data, isLoading = false }) => {
  const productData = React.useMemo(() => {
    return getProductPerformance(data).slice(0, 10); // Top 10 products
  }, [data]);
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4">Product</th>
            <th className="text-right py-3 px-4">Quantity</th>
            <th className="text-right py-3 px-4">Revenue</th>
            <th className="text-right py-3 px-4">Orders</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array(5).fill(0).map((_, index) => (
              <tr key={index} className="border-b border-white/10">
                <td className="py-3 px-4">
                  <div className="h-4 w-32 bg-white/10 animate-pulse rounded"></div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="h-4 w-12 bg-white/10 animate-pulse rounded ml-auto"></div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="h-4 w-16 bg-white/10 animate-pulse rounded ml-auto"></div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="h-4 w-10 bg-white/10 animate-pulse rounded ml-auto"></div>
                </td>
              </tr>
            ))
          ) : productData.length > 0 ? (
            productData.map((product, index) => (
              <tr key={index} className="border-b border-white/10">
                <td className="py-3 px-4">{product.name}</td>
                <td className="py-3 px-4 text-right">{product.quantity}</td>
                <td className="py-3 px-4 text-right">₹{product.revenue.toFixed(2)}</td>
                <td className="py-3 px-4 text-right">{product.orders}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-8 text-center text-white/60">
                No product data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const ShopifyAnalytics: React.FC = () => {
  const { currentUser } = useAuth();
  const [shopifyData, setShopifyData] = useState<ShopifyOrderData[]>([]);
  const [filteredData, setFilteredData] = useState<ShopifyOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  
  // Handle date range selection
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (!startDate || !endDate) return;
    
    console.log(`Shopify Analytics: Filtering by date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    
    setDateRange({ start: startDate, end: endDate });
    
    // Filter data based on date range
    if (shopifyData.length > 0) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      const filtered = shopifyData.filter(order => {
        const orderDate = order.createdAt.split('T')[0];
        return orderDate >= startDateStr && orderDate <= endDateStr;
      });
      
      console.log(`Filtered Shopify data from ${shopifyData.length} to ${filtered.length} orders`);
      setFilteredData(filtered);
      
      if (filtered.length === 0) {
        toast.warning("No data available for the selected date range");
      }
    }
  };
  
  // Calculate metrics for the dashboard
  const metrics = React.useMemo(() => {
    return calculateShopifyMetrics(filteredData);
  }, [filteredData]);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        console.log("Shopify Analytics: Fetching data");
        const data = await getShopifyOrderData(currentUser.uid);
        console.log(`Shopify Analytics: Fetched ${data.length} records`);
        setShopifyData(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error fetching Shopify order data:", error);
        toast.error("Failed to load Shopify analytics data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, refreshTrigger]);
  
  const handleRefresh = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      toast.info("Refreshing data...");
      const data = await getShopifyOrderData(currentUser.uid);
      setShopifyData(data);
      
      // Apply date filtering if a range is selected
      if (dateRange.start && dateRange.end) {
        const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
        const endDateStr = format(dateRange.end, 'yyyy-MM-dd');
        
        const filtered = data.filter(order => {
          const orderDate = order.createdAt.split('T')[0];
          return orderDate >= startDateStr && orderDate <= endDateStr;
        });
        
        setFilteredData(filtered);
      } else {
        setFilteredData(data);
      }
      
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExport = () => {
    if (filteredData.length === 0) return;
    
    try {
      toast.info("Preparing export...");
      
      // Format current date for filename
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const filename = `shopify_analytics_${currentDate}.csv`;
      
      // Flatten the data structure for CSV export
      const flattenedData = filteredData.map(order => ({
        'Order ID': order.orderId,
        'Customer Name': order.name,
        'Email': order.email,
        'Created At': order.createdAt,
        'Financial Status': order.financialStatus,
        'Fulfillment Status': order.fulfillmentStatus,
        'Total': order.total.toFixed(2),
        'Subtotal': order.subtotal.toFixed(2),
        'Shipping': order.shipping.toFixed(2),
        'Taxes': order.taxes.toFixed(2),
        'Discount Amount': order.discountAmount.toFixed(2),
        'Discount Code': order.discountCode,
        'Currency': order.currency,
        'Payment Method': order.paymentMethod,
        'Shipping City': order.shippingAddress.city,
        'Shipping Province': order.shippingAddress.province,
        'Shipping Country': order.shippingAddress.country
      }));
      
      // Convert to CSV
      const headers = Object.keys(flattenedData[0]);
      const csvRows = [headers.join(',')];
      
      flattenedData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : String(value);
        });
        csvRows.push(values.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Export complete");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };
  
  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  if (shopifyData.length === 0 && !isLoading && activeTab !== "upload") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Shopify Analytics</h2>
            <p className="text-white/60 mt-1">
              Analyze your Shopify store performance
            </p>
          </div>
          
          <Button 
            variant="default" 
            size="sm"
            className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90"
            onClick={() => setActiveTab("upload")}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>
        
        <EmptyState
          title="No Shopify data available for analysis"
          description="Please upload your Shopify orders export to see analytics"
          icon={<ShoppingCart className="h-10 w-10 text-adpulse-green/60" />}
          action={
            <Button 
              onClick={() => setActiveTab("upload")} 
              className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90"
            >
              Upload Shopify Data
            </Button>
          }
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#021627]/50">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="upload">Upload Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4 mt-4">
            <Card className="glass-card bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Upload Shopify Data</CardTitle>
                <CardDescription>
                  Upload your Shopify orders export to analyze your store performance
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ShopifyCSVUpload 
                  onUploadSuccess={handleUploadSuccess}
                />
              </CardContent>
            </Card>
            
            <ShopifyUploadHistory refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Shopify Analytics</h2>
          <p className="text-white/60 mt-1">
            Analyze your Shopify store performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-transparent border-white/20 hover:bg-white/5 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="bg-transparent border-white/20 hover:bg-white/5 text-white"
            onClick={handleExport}
            disabled={filteredData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#021627]/50">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Key metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={`₹${metrics.totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
              description="Total revenue from Shopify orders"
              icon={<ShoppingCart className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <StatCard
              title="Total Orders"
              value={metrics.totalOrders.toLocaleString()}
              description="Total number of orders"
              icon={<ShoppingCart className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <StatCard
              title="Average Order Value"
              value={`₹${metrics.averageOrderValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`}
              description="Average value per order"
              icon={<ShoppingCart className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <StatCard
              title="Fulfillment Rate"
              value={`${metrics.fulfillmentRate.toFixed(1)}%`}
              description="Percentage of fulfilled orders"
              icon={<ShoppingCart className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>
          
          {/* Revenue over time chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueOverTimeChart data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Fulfillment Speed</CardTitle>
              </CardHeader>
              <CardContent>
                <FulfillmentSpeedChart data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
          
          {/* Customer insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Orders by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersByRegionChart data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodChart data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Device Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <DeviceUsageChart data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <TopProductsChart data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ShopifyProductTable data={filteredData} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4 mt-4">
          <Card className="bg-[#0B2537] border-white/10 text-center py-12">
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
              <CardDescription>
                Detailed customer analytics coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 mb-4">
                We're working on bringing you detailed customer analytics. Check back soon for updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4 mt-4">
          <Card className="glass-card bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Upload Shopify Data</CardTitle>
              <CardDescription>
                Upload your Shopify orders export to analyze your store performance
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ShopifyCSVUpload 
                onUploadSuccess={handleUploadSuccess}
              />
            </CardContent>
          </Card>
          
          <ShopifyUploadHistory refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShopifyAnalytics;
