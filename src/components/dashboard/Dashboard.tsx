
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdData, calculateMetrics, AdData, getCampaignPerformance } from "@/services/data";
import AnalyticsSummary from "./AnalyticsSummary";
import PerformanceTable from "./PerformanceTable";
import CampaignPerformanceChart from "./CampaignPerformanceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Upload, ListFilter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [adData, setAdData] = useState<AdData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        console.log("Dashboard: Fetching data for user", currentUser.uid);
        const data = await getAdData(currentUser.uid);
        console.log("Dashboard: Fetched data count:", data.length);
        setAdData(data);
        
        if (data.length > 0) {
          console.log("Dashboard: Calculating metrics");
          const calculatedMetrics = calculateMetrics(data);
          setMetrics(calculatedMetrics);
          
          console.log("Dashboard: Getting campaign performance");
          const campaignPerformance = getCampaignPerformance(data);
          const formattedCampaignData = campaignPerformance.map(campaign => ({
            name: campaign.campaignName,
            spend: campaign.metrics.spend,
            sales: campaign.metrics.sales,
            roas: campaign.metrics.roas
          }));
          
          console.log("Dashboard: Setting campaign data", formattedCampaignData.length);
          setCampaignData(formattedCampaignData);
        } else {
          console.log("Dashboard: No data available");
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
      console.log("Dashboard: Refreshing data for user", currentUser.uid);
      const data = await getAdData(currentUser.uid);
      console.log("Dashboard: Refreshed data count:", data.length);
      setAdData(data);
      
      if (data.length > 0) {
        const calculatedMetrics = calculateMetrics(data);
        setMetrics(calculatedMetrics);
        
        const campaignPerformance = getCampaignPerformance(data);
        const formattedCampaignData = campaignPerformance.map(campaign => ({
          name: campaign.campaignName,
          spend: campaign.metrics.spend,
          sales: campaign.metrics.sales,
          roas: campaign.metrics.roas
        }));
        
        setCampaignData(formattedCampaignData);
        toast.success("Data refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUploadClick = () => {
    navigate("/upload");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <ListFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
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
          <Button 
            variant="default" 
            size="sm" 
            className="h-9"
            onClick={handleUploadClick}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Data
          </Button>
        </div>
      </div>
      
      <AnalyticsSummary 
        data={metrics ? {
          amountSpent: metrics.totalSpent,
          purchasesValue: metrics.totalSales,
          roas: metrics.roas,
          linkClicks: metrics.totalVisitors,
          cpc: metrics.cpc,
          ctr: metrics.ctr,
          cpm: metrics.cpm,
          addsToCart: metrics.addsToCart || 0,
          results: metrics.totalOrders
        } : undefined}
        isLoading={isLoading} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CampaignPerformanceChart 
            data={campaignData.length > 0 ? campaignData : undefined}
            isLoading={isLoading} 
          />
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="ctr">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="ctr">CTR</TabsTrigger>
                  <TabsTrigger value="cpc">CPC</TabsTrigger>
                  <TabsTrigger value="cpm">CPM</TabsTrigger>
                </TabsList>
                <TabsContent value="ctr" className="space-y-2">
                  <p className="text-4xl font-bold">{metrics ? (metrics.ctr).toFixed(2) : '0.00'}%</p>
                  <p className="text-sm text-muted-foreground">Average click-through rate across all campaigns</p>
                  <p className="text-sm mt-4">The industry average CTR is 0.90%. Your performance is 
                    <span className={metrics && metrics.ctr > 0.9 ? " text-adpulse-green font-medium" : " text-adpulse-red font-medium"}>
                      {metrics && metrics.ctr > 0.9 ? " above" : " below"} average
                    </span>.
                  </p>
                </TabsContent>
                <TabsContent value="cpc" className="space-y-2">
                  <p className="text-4xl font-bold">₹{metrics ? metrics.cpc.toFixed(2) : '0.00'}</p>
                  <p className="text-sm text-muted-foreground">Average cost per click across all campaigns</p>
                  <p className="text-sm mt-4">The industry average CPC is ₹15.00. Your performance is 
                    <span className={metrics && metrics.cpc < 15 ? " text-adpulse-green font-medium" : " text-adpulse-red font-medium"}>
                      {metrics && metrics.cpc < 15 ? " better" : " worse"} than average
                    </span>.
                  </p>
                </TabsContent>
                <TabsContent value="cpm" className="space-y-2">
                  <p className="text-4xl font-bold">₹{metrics ? metrics.cpm.toFixed(2) : '0.00'}</p>
                  <p className="text-sm text-muted-foreground">Average cost per 1,000 impressions</p>
                  <p className="text-sm mt-4">The industry average CPM is ₹250.00. Your performance is 
                    <span className={metrics && metrics.cpm < 250 ? " text-adpulse-green font-medium" : " text-adpulse-red font-medium"}>
                      {metrics && metrics.cpm < 250 ? " better" : " worse"} than average
                    </span>.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceTable data={adData} isLoading={isLoading} />
        </CardContent>
      </Card>
      
      {adData.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No data available</h3>
          <p className="text-muted-foreground mb-4">Upload your ad data to see insights and analytics</p>
          <Button onClick={handleUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Data
          </Button>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
