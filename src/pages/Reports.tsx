
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Calendar, Download, FileDown, FilterX, LineChart, PieChart, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PerformanceChart from "@/components/charts/PerformanceChart";
import { useAuth } from "@/contexts/AuthContext";
import { getAdData } from "@/services/data";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";

const Reports = () => {
  const { currentUser } = useAuth();
  const [adData, setAdData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const navigate = useNavigate();
  
  React.useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const data = await getAdData(currentUser.uid);
        setAdData(data);
        setHasData(data.length > 0);
      } catch (error) {
        console.error("Error fetching ad data:", error);
        toast.error("Failed to load report data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);
  
  if (!hasData && !isLoading) {
    return (
      <EmptyState
        title="No data available for reports"
        description="Upload your advertising data first to generate custom reports"
        icon={<FileDown className="h-10 w-10 text-adpulse-green/60" />}
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
          <h2 className="text-xl font-semibold">Custom Reports</h2>
          <p className="text-white/60 mt-1">
            Create and customize your advertising reports
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-transparent border-white/20 hover:bg-white/5 text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Feb 19, 2025 - Mar 20, 2025
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
      
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="bg-[#021627]/50 mb-4">
          <TabsTrigger value="view">View Reports</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Ad Spend vs Revenue</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <RefreshCw className="h-8 w-8 text-white/30 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <PerformanceChart
                      title=""
                      data={adData}
                      type="spendVsRevenue"
                      height={300}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">ROAS Over Time</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <RefreshCw className="h-8 w-8 text-white/30 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <PerformanceChart
                      title=""
                      data={adData}
                      type="roas"
                      height={300}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">CPC & CPA Trends</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <RefreshCw className="h-8 w-8 text-white/30 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <PerformanceChart
                      title=""
                      data={adData}
                      type="cpcVsCpa"
                      height={300}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-[#0B2537] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">CTR by Campaign</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <RefreshCw className="h-8 w-8 text-white/30 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <PerformanceChart
                      title=""
                      data={adData}
                      type="ctr"
                      height={300}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="bg-transparent border-white/20 hover:bg-white/5">
              <Download className="h-4 w-4 mr-2" />
              Export Report Data
            </Button>
          </div>
          
          <div className="mt-4 text-center text-xs text-white/50">
            Showing data from Feb 19, 2025 to Mar 20, 2025
          </div>
        </TabsContent>
        
        <TabsContent value="customize" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Customize Reports</CardTitle>
              <CardDescription>
                Select metrics and dimensions to create custom reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Available Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex items-center p-2 rounded-md border border-white/10 bg-[#021627] cursor-pointer hover:bg-white/5">
                      <div className="mr-2 text-adpulse-green">
                        <LineChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">ROAS</span>
                    </div>
                    <div className="flex items-center p-2 rounded-md border border-white/10 bg-[#021627] cursor-pointer hover:bg-white/5">
                      <div className="mr-2 text-adpulse-green">
                        <BarChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">CPC</span>
                    </div>
                    <div className="flex items-center p-2 rounded-md border border-white/10 bg-[#021627] cursor-pointer hover:bg-white/5">
                      <div className="mr-2 text-adpulse-green">
                        <PieChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">CTR</span>
                    </div>
                    <div className="flex items-center p-2 rounded-md border border-white/10 bg-[#021627] cursor-pointer hover:bg-white/5">
                      <div className="mr-2 text-adpulse-green">
                        <BarChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Impressions</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Selected Metrics</h3>
                  <div className="min-h-[150px] rounded-md border border-dashed border-white/20 p-4 bg-[#021627]/50">
                    <p className="text-sm text-white/50 text-center">
                      Drag metrics here to add them to your report
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Chart Type</h3>
                  <div className="space-y-2">
                    <div className="flex items-center p-2 rounded-md border border-adpulse-green bg-adpulse-green/10 cursor-pointer">
                      <div className="mr-2 text-adpulse-green">
                        <LineChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Line Chart</span>
                    </div>
                    <div className="flex items-center p-2 rounded-md border border-white/10 bg-[#021627] cursor-pointer hover:bg-white/5">
                      <div className="mr-2">
                        <BarChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Bar Chart</span>
                    </div>
                    <div className="flex items-center p-2 rounded-md border border-white/10 bg-[#021627] cursor-pointer hover:bg-white/5">
                      <div className="mr-2">
                        <PieChart className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Pie Chart</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-white/60 text-sm mb-4">
                  This feature is coming soon! Check back for updates.
                </p>
                <Button disabled className="bg-adpulse-green text-[#021627] opacity-50 cursor-not-allowed">
                  Create Custom Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
