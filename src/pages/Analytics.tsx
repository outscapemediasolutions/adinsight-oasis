
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

const Analytics = () => {
  const { currentUser } = useAuth();
  const [adData, setAdData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [hasData, setHasData] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const data = await getAdData(currentUser.uid);
        setAdData(data);
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
      const data = await getAdData(currentUser.uid);
      setAdData(data);
      setHasData(data.length > 0);
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
        title="No data available for analysis"
        description="Please upload your advertising data first to see analytics"
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
          <h2 className="text-xl font-semibold">Advanced Analytics</h2>
          <p className="text-white/60 mt-1">
            Detailed analysis of your advertising performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="bg-transparent border-white/20 hover:bg-white/5 text-white"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Filters
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
          <TabsTrigger value="campaigns">Campaign Analysis</TabsTrigger>
          <TabsTrigger value="adsets">Ad Set Analysis</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Analysis</TabsTrigger>
          <TabsTrigger value="audience">Audience Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Campaign ROAS</CardTitle>
                <CardDescription>Return on ad spend by campaign</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={adData}
                    type="campaign"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Campaign CTR</CardTitle>
                <CardDescription>Click-through rate by campaign</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={adData}
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
              <CardTitle className="text-lg font-medium">Campaign Performance</CardTitle>
              <CardDescription>Detailed breakdown of campaign metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTable data={adData} isLoading={isLoading} />
            </CardContent>
          </Card>
          
          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="bg-transparent border-white/20 hover:bg-white/5">
              <Download className="h-4 w-4 mr-2" />
              Export Campaign Data
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="adsets" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Ad Set Performance</CardTitle>
                <CardDescription>Spend vs. results by ad set</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={adData}
                    type="campaign"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Ad Set CTR</CardTitle>
                <CardDescription>Click-through rate by ad set</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={adData}
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
              <CardTitle className="text-lg font-medium">Ad Set Breakdown</CardTitle>
              <CardDescription>Detailed performance metrics by ad set</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTable data={adData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="conversion" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Conversion Rate</CardTitle>
                <CardDescription>Conversion rate over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={adData}
                    type="cvr"
                    height={300}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Cost Per Acquisition</CardTitle>
                <CardDescription>CPA trends over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  <PerformanceChart
                    title=""
                    data={adData}
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
              <CardTitle className="text-lg font-medium">Conversion Path Analysis</CardTitle>
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
              <CardTitle className="text-lg font-medium">Audience Insights</CardTitle>
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
