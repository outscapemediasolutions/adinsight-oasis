
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getAdData, 
  calculateMetrics, 
  AdData, 
  getCampaignPerformance, 
  getAdSetPerformance, 
  getUniqueCampaigns, 
  getUniqueAdSets,
  exportToCSV
} from "@/services/data";
import AnalyticsSummary from "@/components/dashboard/AnalyticsSummary";
import PerformanceChart from "@/components/charts/PerformanceChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  ChevronDown, 
  Download, 
  RefreshCw, 
  Upload, 
  Filter, 
  FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import DateRangeSelector from "@/components/DateRangeSelector";
import { format, parse } from "date-fns";
import UploadHistory from "@/components/UploadHistory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const DateRangePresets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7days" },
  { label: "Last 30 Days", value: "last30days" },
  { label: "This Month", value: "thismonth" },
  { label: "Last Month", value: "lastmonth" },
  { label: "Custom Range", value: "custom" }
];

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [adData, setAdData] = useState<AdData[]>([]);
  const [filteredData, setFilteredData] = useState<AdData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null);
  const [hasData, setHasData] = useState(false);
  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [adSets, setAdSets] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedAdSet, setSelectedAdSet] = useState<string>("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("last7days");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUploadHistory, setShowUploadHistory] = useState(false);
  
  const navigate = useNavigate();
  
  // Handle URL parameters
  useEffect(() => {
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    if (startDateParam && endDateParam) {
      try {
        // Parse dates from URL parameters (YYYY-MM-DD format)
        const startDate = parse(startDateParam, 'yyyy-MM-dd', new Date());
        const endDate = parse(endDateParam, 'yyyy-MM-dd', new Date());
        
        setDateRange({ start: startDate, end: endDate });
        setSelectedDatePreset("custom");
      } catch (error) {
        console.error("Error parsing date from URL:", error);
      }
    }
  }, [searchParams]);
  
  // Handle preset date range changes
  useEffect(() => {
    if (!selectedDatePreset || selectedDatePreset === "custom") return;
    
    const today = new Date();
    let start: Date = today;
    let end: Date = today;
    
    switch (selectedDatePreset) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case "last7days":
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        end = today;
        break;
      case "last30days":
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        end = today;
        break;
      case "thismonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case "lastmonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }
    
    setDateRange({ start, end });
  }, [selectedDatePreset]);
  
  // Handle campaign selection change
  useEffect(() => {
    if (selectedCampaign) {
      // Update ad sets for selected campaign
      const campaignAdSets = getUniqueAdSets(adData, selectedCampaign);
      setAdSets(campaignAdSets);
      
      // Reset ad set selection
      setSelectedAdSet("");
      
      // Filter data by campaign
      const filtered = adData.filter(item => item.campaignName === selectedCampaign);
      setFilteredData(filtered);
      
      // Update metrics
      if (filtered.length > 0) {
        const calculatedMetrics = calculateMetrics(filtered);
        setMetrics(calculatedMetrics);
      }
    } else if (selectedAdSet) {
      // Reset filters to apply only date filter
      handleDateRangeChange(dateRange.start, dateRange.end);
    }
  }, [selectedCampaign]);
  
  // Handle ad set selection change
  useEffect(() => {
    if (selectedAdSet) {
      // Filter data by ad set (and campaign if selected)
      const filtered = adData.filter(item => {
        if (selectedCampaign) {
          return item.campaignName === selectedCampaign && item.adSetName === selectedAdSet;
        }
        return item.adSetName === selectedAdSet;
      });
      
      setFilteredData(filtered);
      
      // Update metrics
      if (filtered.length > 0) {
        const calculatedMetrics = calculateMetrics(filtered);
        setMetrics(calculatedMetrics);
      }
    } else if (selectedCampaign) {
      // Apply only campaign filter
      const filtered = adData.filter(item => item.campaignName === selectedCampaign);
      setFilteredData(filtered);
      
      if (filtered.length > 0) {
        const calculatedMetrics = calculateMetrics(filtered);
        setMetrics(calculatedMetrics);
      }
    }
  }, [selectedAdSet]);
  
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (!startDate || !endDate) return;
    
    // Update date range state
    setDateRange({ start: startDate, end: endDate });
    
    // Convert dates to string format for filtering
    const formatDateToString = (date: Date) => {
      return format(date, 'yyyy-MM-dd');
    };
    
    const startDateStr = formatDateToString(startDate);
    const endDateStr = formatDateToString(endDate);
    
    // Update URL parameters
    setSearchParams(prev => {
      prev.set('startDate', startDateStr);
      prev.set('endDate', endDateStr);
      return prev;
    });
    
    // Filter data based on date range and any selected campaign/ad set
    if (adData.length > 0) {
      let filtered = adData.filter(item => {
        return item.date >= startDateStr && item.date <= endDateStr;
      });
      
      // Apply campaign filter if selected
      if (selectedCampaign) {
        filtered = filtered.filter(item => item.campaignName === selectedCampaign);
      }
      
      // Apply ad set filter if selected
      if (selectedAdSet) {
        filtered = filtered.filter(item => item.adSetName === selectedAdSet);
      }
      
      console.log(`Dashboard: Filtered data from ${adData.length} to ${filtered.length} items`);
      setFilteredData(filtered);
      
      if (filtered.length > 0) {
        const calculatedMetrics = calculateMetrics(filtered);
        setMetrics(calculatedMetrics);
      } else {
        setMetrics(null);
        toast.warning("No data available for the selected filters");
      }
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        console.log("Dashboard: Fetching data");
        
        // Get filters from URL or state
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const campaignParam = searchParams.get('campaign');
        const adSetParam = searchParams.get('adSet');
        
        let filters: any = {};
        
        if (startDateParam && endDateParam) {
          filters.startDate = startDateParam;
          filters.endDate = endDateParam;
        }
        
        if (campaignParam) {
          filters.campaignName = campaignParam;
          setSelectedCampaign(campaignParam);
        }
        
        if (adSetParam) {
          filters.adSetName = adSetParam;
          setSelectedAdSet(adSetParam);
        }
        
        const data = await getAdData(currentUser.uid, filters);
        console.log(`Dashboard: Fetched ${data.length} records`);
        
        // Set full data
        setAdData(data);
        
        // Set filtered data based on any active filters
        if (Object.keys(filters).length > 0) {
          setFilteredData(data);
        } else {
          setFilteredData(data);
        }
        
        setHasData(data.length > 0);
        
        if (data.length > 0) {
          // Get unique campaigns
          const uniqueCampaigns = getUniqueCampaigns(data);
          setCampaigns(uniqueCampaigns);
          
          // Calculate metrics for filtered or all data
          const calculatedMetrics = calculateMetrics(data);
          setMetrics(calculatedMetrics);
          
          // If campaign is selected, get ad sets
          if (selectedCampaign) {
            const campaignAdSets = getUniqueAdSets(data, selectedCampaign);
            setAdSets(campaignAdSets);
          }
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
      
      // Get filters from state
      let filters: any = {};
      
      if (dateRange.start && dateRange.end) {
        filters.startDate = format(dateRange.start, 'yyyy-MM-dd');
        filters.endDate = format(dateRange.end, 'yyyy-MM-dd');
      }
      
      if (selectedCampaign) {
        filters.campaignName = selectedCampaign;
      }
      
      if (selectedAdSet) {
        filters.adSetName = selectedAdSet;
      }
      
      const data = await getAdData(currentUser.uid, filters);
      
      setAdData(data);
      setFilteredData(data);
      setHasData(data.length > 0);
      
      if (data.length > 0) {
        // Get unique campaigns
        const uniqueCampaigns = getUniqueCampaigns(data);
        setCampaigns(uniqueCampaigns);
        
        // Calculate metrics
        const calculatedMetrics = calculateMetrics(data);
        setMetrics(calculatedMetrics);
        
        // If campaign is selected, get ad sets
        if (selectedCampaign) {
          const campaignAdSets = getUniqueAdSets(data, selectedCampaign);
          setAdSets(campaignAdSets);
        }
        
        toast.success("Data refreshed successfully");
      } else {
        toast.warning("No data available for the selected filters");
      }
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
      
      // Format filename with current filters
      let filename = "adpulse_export";
      
      if (dateRange.start && dateRange.end) {
        filename += `_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}`;
      }
      
      if (selectedCampaign) {
        filename += `_${selectedCampaign.replace(/[^a-z0-9]/gi, '_')}`;
      }
      
      if (selectedAdSet) {
        filename += `_${selectedAdSet.replace(/[^a-z0-9]/gi, '_')}`;
      }
      
      // Export to CSV
      exportToCSV(filteredData, filename);
      
      toast.success("Export complete");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };
  
  const handleUploadClick = () => {
    navigate("/upload");
  };
  
  const toggleUploadHistory = () => {
    setShowUploadHistory(!showUploadHistory);
  };
  
  if (!hasData && !isLoading) {
    return (
      <EmptyState
        title="No data available"
        description="Please upload a CSV file in the Data Upload section to see your analytics."
        icon={<Upload className="h-10 w-10 text-adpulse-green/60" />}
        action={
          <Button onClick={handleUploadClick} className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90 font-poppins">
            Upload Data
          </Button>
        }
      />
    );
  }
  
  return (
    <div className="space-y-6 font-poppins">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold font-poppins">Performance Overview</h2>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex">
            <Select value={selectedDatePreset} onValueChange={setSelectedDatePreset}>
              <SelectTrigger className="w-[180px] bg-transparent border-white/20 text-white">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DateRangePresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DateRangeSelector 
            onDateRangeChange={handleDateRangeChange} 
            initialStartDate={dateRange.start}
            initialEndDate={dateRange.end}
          />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleUploadHistory}
            className="bg-transparent border-white/20 hover:bg-white/5 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            History
          </Button>
          
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
          
          <Button 
            variant="default" 
            size="sm"
            onClick={handleUploadClick}
            className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
      
      {showUploadHistory ? (
        <UploadHistory />
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[250px] bg-transparent border-white/20 text-white">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign} value={campaign}>
                    {campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedCampaign && (
              <Select value={selectedAdSet} onValueChange={setSelectedAdSet}>
                <SelectTrigger className="w-[250px] bg-transparent border-white/20 text-white">
                  <SelectValue placeholder="All Ad Sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Ad Sets</SelectItem>
                  {adSets.map((adSet) => (
                    <SelectItem key={adSet} value={adSet}>
                      {adSet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {(selectedCampaign || selectedAdSet) && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCampaign("");
                  setSelectedAdSet("");
                  handleDateRangeChange(dateRange.start, dateRange.end);
                }}
                className="bg-transparent border-white/20 hover:bg-white/5 text-white"
              >
                Clear Filters
              </Button>
            )}
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
              title="Revenue vs Ad Spend"
              description="Purchases conversion value compared to ad spend over time"
              data={filteredData}
              type="spendVsRevenue"
              isLoading={isLoading}
            />
            
            <PerformanceChart
              title="ROAS Trend"
              description="Purchase ROAS (Return on Ad Spend) over time"
              data={filteredData}
              type="roas"
              isLoading={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChart
              title="CPC & CPA Trends"
              description="Cost per click and cost per result over time"
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
                <CardTitle className="text-lg font-medium font-poppins">Campaign Performance</CardTitle>
                <CardDescription>Compare performance across all campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="spend" className="w-full">
                  <TabsList className="bg-[#021627]/50 mb-4">
                    <TabsTrigger value="spend" className="font-poppins">Spend & Revenue</TabsTrigger>
                    <TabsTrigger value="conversion" className="font-poppins">Conversion Metrics</TabsTrigger>
                    <TabsTrigger value="engagement" className="font-poppins">Engagement</TabsTrigger>
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
        </>
      )}
    </div>
  );
};

export default Dashboard;
