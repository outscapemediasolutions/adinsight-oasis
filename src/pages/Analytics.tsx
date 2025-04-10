
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAdData, calculateMetrics, getCampaignPerformance } from "@/services/data";
import { BarChart, Calendar, Download, FilterX, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import PerformanceChart from "@/components/charts/PerformanceChart";
import EmptyState from "@/components/EmptyState";
import PerformanceTable from "@/components/dashboard/PerformanceTable";
import DateRangeSelector from "@/components/DateRangeSelector";
import { format } from "date-fns";

const Analytics = () => {
  const { currentUser } = useAuth();
  const [adData, setAdData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [hasData, setHasData] = useState(false);
  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});
  const navigate = useNavigate();
  
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (!startDate || !endDate) return;
    
    console.log(`Meta Analytics: Filtering by date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    
    setDateRange({ start: startDate, end: endDate });
    
    // Convert dates to string format for filtering
    const formatDateToString = (date: Date) => {
      return format(date, 'yyyy-MM-dd');
    };
    
    const startDateStr = formatDateToString(startDate);
    const endDateStr = formatDateToString(endDate);
    
    // Filter data based on date range
    if (adData.length > 0) {
      const filtered = adData.filter((item: any) => {
        return item.date >= startDateStr && item.date <= endDateStr;
      });
      
      console.log(`Meta Analytics: Filtered data from ${adData.length} to ${filtered.length} items`);
      setFilteredData(filtered);
      
      if (filtered.length === 0) {
        toast.warning("No data available for the selected date range");
      }
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        console.log("Meta Analytics: Fetching data");
        const data = await getAdData(currentUser.uid);
        console.log(`Meta Analytics: Fetched ${data.length} records`);
        setAdData(data);
        setFilteredData(data);
        setHasData(data.length > 0);
      } catch (error) {
        console.error("Error fetching ad data:", error);
        toast.error("Failed to load analytics data");
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
      console.log("Meta Analytics: Refreshing data");
      const data = await getAdData(currentUser.uid);
      setAdData(data);
      
      // Apply date filtering if a range is selected
      if (dateRange.start && dateRange.end) {
        const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
        const endDateStr = format(dateRange.end, 'yyyy-MM-dd');
        
        const filtered = data.filter((item: any) => {
          return item.date >= startDateStr && item.date <= endDateStr;
        });
        
        setFilteredData(filtered);
      } else {
        setFilteredData(data);
      }
      
      setHasData(data.length > 0);
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentUser || filteredData.length === 0) return;
    
    try {
      toast.info("Preparing export...");
      
      // Format current date for filename
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const filename = `adpulse_analytics_${currentDate}.csv`;
      
      // Convert to CSV and download
      const headers = Object.keys(filteredData[0]).filter(key => key !== "userId");
      const csvRows = [headers.join(',')];
      
      filteredData.forEach((item) => {
        const values = headers.map(header => {
          const value = item[header];
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
  
  if (!hasData && !isLoading) {
    return (
      <EmptyState
        title="No Meta Ad data available for analysis"
        description="Please upload your Meta advertising data first to see analytics"
        icon={<BarChart className="h-10 w-10 text-adpulse-green/60" />}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold font-poppins">Meta Ad Analytics</h2>
          <p className="text-white/60 mt-1 font-poppins">
            Detailed analysis of your Meta advertising performance
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
      
      <Tabs 
        defaultValue="campaigns" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="bg-[#021627]/50 mb-4">
          <TabsTrigger value="campaigns" className="font-poppins">Campaign Analysis</TabsTrigger>
          <TabsTrigger value="adsets" className="font-poppins">Ad Set Analysis</TabsTrigger>
          <TabsTrigger value="conversion" className="font-poppins">Conversion Analysis</TabsTrigger>
          <TabsTrigger value="audience" className="font-poppins">Audience Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium font-poppins">Campaign ROAS</CardTitle>
                <CardDescription>Return on ad spend by campaign</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={filteredData}
                    type="campaign"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium font-poppins">Campaign CTR</CardTitle>
                <CardDescription>Click-through rate by campaign</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={filteredData}
                    type="ctr"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium font-poppins">Campaign Performance</CardTitle>
              <CardDescription>Detailed breakdown of campaign metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTable data={filteredData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="adsets" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium font-poppins">Ad Set Performance</CardTitle>
                <CardDescription>Spend vs. results by ad set</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={filteredData}
                    type="campaign"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium font-poppins">Ad Set CTR</CardTitle>
                <CardDescription>Click-through rate by ad set</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={filteredData}
                    type="ctr"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium font-poppins">Ad Set Breakdown</CardTitle>
              <CardDescription>Detailed performance metrics by ad set</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTable data={filteredData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="conversion" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium font-poppins">Conversion Rate</CardTitle>
                <CardDescription>Conversion rate over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={filteredData}
                    type="cvr"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium font-poppins">Cost Per Acquisition</CardTitle>
                <CardDescription>CPA trends over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={filteredData}
                    type="cpcVsCpa"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium font-poppins">Conversion Path Analysis</CardTitle>
              <CardDescription>How users convert across your funnel</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center">
              <p className="text-white/60 mb-4">
                Advanced conversion path analysis is coming soon.
              </p>
              <Button disabled className="bg-adpulse-green text-[#021627] opacity-50 cursor-not-allowed">
                Enable Advanced Tracking
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audience" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-medium font-poppins">Audience Insights</CardTitle>
              <CardDescription>Understand your audience demographics and behavior</CardDescription>
            </CardHeader>
            <CardContent className="py-10 text-center">
              <EmptyState
                title="Audience insights coming soon"
                description="We're working on bringing you detailed audience analytics. Check back soon for updates."
                icon={<Users className="h-10 w-10 text-adpulse-green/60" />}
                className="h-auto py-10"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Users = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
};

export default Analytics;
