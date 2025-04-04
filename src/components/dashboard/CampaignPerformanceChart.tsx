
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  formatChartLabel
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Cell, 
  AreaChart, 
  Area, 
  Tooltip,
  ReferenceLine,
  Legend,
  LineChart,
  Line
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CampaignData {
  name: string;
  spend: number;
  sales: number;
  roas: number;
  conversionRate?: number;
}

interface CampaignPerformanceChartProps {
  data?: CampaignData[];
  isLoading?: boolean;
}

const CampaignPerformanceChart = ({ data, isLoading = false }: CampaignPerformanceChartProps) => {
  const [activeTab, setActiveTab] = useState('roas');
  console.log("CampaignPerformanceChart received data:", data);
  
  // Use the data passed in or fall back to placeholder data if none provided
  const chartData: CampaignData[] = data || [
    { name: "Summer Sale", spend: 12000, sales: 36000, roas: 3.0, conversionRate: 2.5 },
    { name: "New Collection", spend: 8500, sales: 21250, roas: 2.5, conversionRate: 1.8 },
    { name: "Holiday Special", spend: 15000, sales: 37500, roas: 2.5, conversionRate: 3.2 },
    { name: "Flash Sale", spend: 5000, sales: 18000, roas: 3.6, conversionRate: 4.1 },
    { name: "Clearance", spend: 6500, sales: 9750, roas: 1.5, conversionRate: 1.2 }
  ];

  // Add validation to ensure we have valid numbers in our data
  const validatedChartData = chartData.map(item => ({
    ...item,
    spend: Number(item.spend) || 0,
    sales: Number(item.sales) || 0,
    roas: Number(item.roas) || 0,
    conversionRate: Number(item.conversionRate) || 0
  }));

  // Only sort if we have real data (not placeholder data)
  const sortedByRoas = data 
    ? [...validatedChartData]
        .filter(item => item && item.roas !== undefined) // Filter out undefined ROAS
        .sort((a, b) => (b.roas || 0) - (a.roas || 0))
        .slice(0, 10) // Limit to top 10
    : validatedChartData;
    
  const sortedBySpend = data
    ? [...validatedChartData]
        .filter(item => item && item.spend !== undefined) // Filter out undefined spend
        .sort((a, b) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 10) // Limit to top 10
    : validatedChartData;
    
  const sortedBySales = data
    ? [...validatedChartData]
        .filter(item => item && item.sales !== undefined) // Filter out undefined sales
        .sort((a, b) => (b.sales || 0) - (a.sales || 0))
        .slice(0, 10) // Limit to top 10
    : validatedChartData;

  const sortedByConversion = data
    ? [...validatedChartData]
        .filter(item => item && item.conversionRate !== undefined) // Filter out undefined conversion rate
        .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
        .slice(0, 10) // Limit to top 10
    : validatedChartData;

  // Updated color palette with higher visibility
  const colors = {
    roas: "#ffcc00",
    spend: "#ff9800",
    sales: "#6fe394",
    conversion: "#4dabf5"
  };
  
  const gradientColors = {
    roas: ["rgba(255, 204, 0, 0.8)", "rgba(255, 204, 0, 0.1)"],
    spend: ["rgba(255, 152, 0, 0.8)", "rgba(255, 152, 0, 0.1)"],
    sales: ["rgba(111, 227, 148, 0.8)", "rgba(111, 227, 148, 0.1)"],
    conversion: ["rgba(77, 171, 245, 0.8)", "rgba(77, 171, 245, 0.1)"]
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-[#0B2537] border border-white/10 rounded-md p-2 shadow-lg text-xs max-w-[240px]">
        <p className="font-medium mb-1 break-words">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-2 mb-1">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-mono">
              {entry.name === 'ROAS'
                ? `${entry.value.toFixed(2)}x`
                : entry.name === 'Conversion Rate'
                  ? `${entry.value.toFixed(2)}%`
                  : `₹${entry.value.toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
          </CardTitle>
          <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/30 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    spend: {
      label: "Ad Spend",
      theme: {
        light: colors.spend,
        dark: colors.spend
      }
    },
    sales: {
      label: "Sales Revenue",
      theme: {
        light: colors.sales,
        dark: colors.sales
      }
    },
    roas: {
      label: "ROAS",
      theme: {
        light: colors.roas,
        dark: colors.roas
      }
    },
    conversion: {
      label: "Conversion Rate",
      theme: {
        light: colors.conversion,
        dark: colors.conversion
      }
    }
  };

  // Check if there's any data to display
  const hasData = chartData && chartData.length > 0;
  const noDataMessage = (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      No data available for selected period
    </div>
  );

  return (
    <Card className="bg-[#0B2537] border-white/10">
      <CardHeader className="pb-0 pt-3">
        <CardTitle className="flex items-center gap-2 text-white text-base">
          Campaign Performance <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="roas" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#021627]/50 mx-3 my-2 w-auto h-8">
            <TabsTrigger value="roas" className="text-xs py-0 px-3">ROAS</TabsTrigger>
            <TabsTrigger value="spend" className="text-xs py-0 px-3">Spend</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs py-0 px-3">Sales</TabsTrigger>
            <TabsTrigger value="conversion" className="text-xs py-0 px-3">Conversion</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roas" className="h-[300px] px-2 pt-0 pb-2">
            {!hasData ? noDataMessage : (
              <TooltipProvider>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedByRoas} margin={{ top: 0, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      axisLine={{ stroke: '#37474f' }}
                      height={60}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const formattedName = formatChartLabel(payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <text 
                                  x={0} 
                                  y={0} 
                                  dy={8} 
                                  textAnchor="end" 
                                  fill="#e0f2f1" 
                                  transform="rotate(-45)"
                                  fontSize={10}
                                  className="cursor-help"
                                >
                                  {formattedName}
                                </text>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] text-xs">
                                <p>{payload.value}</p>
                              </TooltipContent>
                            </UITooltip>
                          </g>
                        );
                      }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(1)}x`} 
                      domain={[0, Math.max(...sortedByRoas.map(item => item.roas || 0)) * 1.1 || 5]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 10 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickSize={3}
                      tickMargin={2}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={3} stroke="#ffcc00" strokeDasharray="3 3" label={{ 
                      value: "3x", 
                      fill: "#ffcc00", 
                      position: "insideBottomRight", 
                      fontSize: 10 
                    }} />
                    <Bar 
                      dataKey="roas" 
                      name="ROAS" 
                      fill={colors.roas}
                      isAnimationActive={true}
                      barSize={22}
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend 
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TooltipProvider>
            )}
          </TabsContent>
          
          <TabsContent value="spend" className="h-[300px] px-2 pt-0 pb-2">
            {!hasData ? noDataMessage : (
              <TooltipProvider>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedBySpend} margin={{ top: 0, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      axisLine={{ stroke: '#37474f' }}
                      height={60}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const formattedName = formatChartLabel(payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <text 
                                  x={0} 
                                  y={0} 
                                  dy={8} 
                                  textAnchor="end" 
                                  fill="#e0f2f1" 
                                  transform="rotate(-45)"
                                  fontSize={10}
                                  className="cursor-help"
                                >
                                  {formattedName}
                                </text>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] text-xs">
                                <p>{payload.value}</p>
                              </TooltipContent>
                            </UITooltip>
                          </g>
                        );
                      }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value/1000}k`} 
                      domain={[0, Math.max(...sortedBySpend.map(item => item.spend || 0)) * 1.1 || 20000]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 10 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickSize={3}
                      tickMargin={2}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="spend" 
                      name="Ad Spend" 
                      fill={colors.spend}
                      isAnimationActive={true}
                      barSize={22}
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend 
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TooltipProvider>
            )}
          </TabsContent>
          
          <TabsContent value="sales" className="h-[300px] px-2 pt-0 pb-2">
            {!hasData ? noDataMessage : (
              <TooltipProvider>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedBySales} margin={{ top: 0, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      axisLine={{ stroke: '#37474f' }}
                      height={60}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const formattedName = formatChartLabel(payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <text 
                                  x={0} 
                                  y={0} 
                                  dy={8} 
                                  textAnchor="end" 
                                  fill="#e0f2f1" 
                                  transform="rotate(-45)"
                                  fontSize={10}
                                  className="cursor-help"
                                >
                                  {formattedName}
                                </text>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] text-xs">
                                <p>{payload.value}</p>
                              </TooltipContent>
                            </UITooltip>
                          </g>
                        );
                      }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value/1000}k`} 
                      domain={[0, Math.max(...sortedBySales.map(item => item.sales || 0)) * 1.1 || 40000]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 10 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickSize={3}
                      tickMargin={2}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="sales" 
                      name="Sales Revenue" 
                      fill={colors.sales}
                      isAnimationActive={true}
                      barSize={22}
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend 
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TooltipProvider>
            )}
          </TabsContent>
          
          <TabsContent value="conversion" className="h-[300px] px-2 pt-0 pb-2">
            {!hasData ? noDataMessage : (
              <TooltipProvider>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedByConversion} margin={{ top: 0, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      axisLine={{ stroke: '#37474f' }}
                      height={60}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const formattedName = formatChartLabel(payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <text 
                                  x={0} 
                                  y={0} 
                                  dy={8} 
                                  textAnchor="end" 
                                  fill="#e0f2f1" 
                                  transform="rotate(-45)"
                                  fontSize={10}
                                  className="cursor-help"
                                >
                                  {formattedName}
                                </text>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] text-xs">
                                <p>{payload.value}</p>
                              </TooltipContent>
                            </UITooltip>
                          </g>
                        );
                      }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(1)}%`} 
                      domain={[0, Math.max(...sortedByConversion.map(item => item.conversionRate || 0)) * 1.1 || 5]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 10 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickSize={3}
                      tickMargin={2}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="conversionRate" 
                      name="Conversion Rate" 
                      fill={colors.conversion}
                      isAnimationActive={true}
                      barSize={22}
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend 
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TooltipProvider>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CampaignPerformanceChart;
