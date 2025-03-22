
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdData, calculateMetrics, AdData, getCampaignPerformance } from "@/services/data";
import AnalyticsSummary from "@/components/dashboard/AnalyticsSummary";
import PerformanceChart from "@/components/charts/PerformanceChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronDown, Download, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import DateRangeSelector from "@/components/DateRangeSelector";
import { format } from "date-fns";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [adData, setAdData] = useState<AdData[]>([]);
  const [filteredData, setFilteredData] = useState<AdData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null);
  const [hasData, setHasData] = useState(false);
  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});
  const navigate = useNavigate();
  
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (!startDate || !endDate) return;
    
    setDateRange({ start: startDate, end: endDate });
    
    // Convert dates to string format for filtering
    const formatDateToString = (date: Date) => {
      return format(date, 'yyyy-MM-dd');
    };
    
    const startDateStr = formatDateToString(startDate);
    const endDateStr = formatDateToString(endDate);
    
    console.log(`Filtering by date range: ${startDateStr} to ${endDateStr}`);
    
    // Filter data based on date range
    if (adData.length > 0) {
      const filtered = adData.filter(item => {
        return item.date >= startDateStr && item.date <= endDateStr;
      });
      
      console.log(`Filtered data from ${adData.length} to ${filtered.length} items`);
      setFilteredData(filtered);
      
      if (filtered.length > 0) {
        const calculatedMetrics = calculateMetrics(filtered);
        setMetrics(calculatedMetrics);
      }
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const data = await getAdData(currentUser.uid);
        console.log(`Fetched ${data.length} records`);
        setAdData(data);
        setFilteredData(data); // Initialize filtered data with all data
        setHasData(data.length > 0);
        
        if (data.length > 0) {
          const calculatedMetrics = calculateMetrics(data);
          setMetrics(calculatedMetrics);
        }
      } catch (error) {
        console.error("Error fetching ad data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);
  
  const handleRefresh = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      toast.info("Refreshing data...");
      const data = await getAdData(currentUser.uid);
      
      setAdData(data);
      setHasData(data.length > 0);
      
      // Apply date filtering if a range is selected
      if (dateRange.start && dateRange.end) {
        const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
        const endDateStr = format(dateRange.end, 'yyyy-MM-dd');
        
        const filtered = data.filter(item => {
          return item.date >= startDateStr && item.date <= endDateStr;
        });
        
        setFilteredData(filtered);
        
        if (filtered.length > 0) {
          const calculatedMetrics = calculateMetrics(filtered);
          setMetrics(calculatedMetrics);
        }
      } else {
        setFilteredData(data);
        
        if (data.length > 0) {
          const calculatedMetrics = calculateMetrics(data);
          setMetrics(calculatedMetrics);
        }
      }
      
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!hasData && !isLoading) {
    return (
      <EmptyState
        title="No data available"
        description="Please upload a CSV file in the Data Upload section to see your analytics."
        icon={<Upload className="h-10 w-10 text-adpulse-green/60" />}
        action={
          <Button onClick={() => navigate("/upload")} className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90">
            Upload Data
          </Button>
        }
      />
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Performance Overview</h2>
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
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <AnalyticsSummary 
        data={metrics ? {
          totalSales: metrics.totalSales,
          totalOrders: metrics.totalOrders,
          totalVisitors: metrics.totalVisitors,
          roas: metrics.roas
        } : undefined}
        isLoading={isLoading} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart
          title="Spend vs. Revenue"
          description="Ad spend and revenue trends over time"
          data={filteredData}
          type="spendVsRevenue"
          isLoading={isLoading}
        />
        
        <PerformanceChart
          title="ROAS Trend"
          description="Return on ad spend performance over time"
          data={filteredData}
          type="roas"
          isLoading={isLoading}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart
          title="CPC & CPA Trends"
          description="Cost per click and cost per acquisition over time"
          data={filteredData}
          type="cpcVsCpa"
          isLoading={isLoading}
        />
        
        <PerformanceChart
          title="CTR by Campaign"
          description="Click-through rate by campaign"
          data={filteredData}
          type="ctr"
          isLoading={isLoading}
        />
      </div>
      
      <div className="mt-6">
        <Card className="bg-[#0B2537] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Campaign Performance</CardTitle>
            <CardDescription>Compare performance across all campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="spend" className="w-full">
              <TabsList className="bg-[#021627]/50 mb-4">
                <TabsTrigger value="spend">Spend & Revenue</TabsTrigger>
                <TabsTrigger value="conversion">Conversion Metrics</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
              </TabsList>
              
              <TabsContent value="spend" className="mt-0">
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="h-[400px]">
                    <PerformanceChart
                      title=""
                      data={filteredData}
                      type="campaign"
                      height={400}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="conversion" className="mt-0">
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="h-[400px]">
                    <PerformanceChart
                      title=""
                      data={filteredData}
                      type="cvr"
                      height={400}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="engagement" className="mt-0">
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="h-[400px]">
                    <PerformanceChart
                      title=""
                      data={filteredData}
                      type="ctr"
                      height={400}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
