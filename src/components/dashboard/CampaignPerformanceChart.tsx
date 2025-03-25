
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
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
  ReferenceLine
} from "recharts";
import { ArrowUpDown } from "lucide-react";

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
  console.log("CampaignPerformanceChart received data:", data);
  
  // Use the data passed in or fall back to placeholder data if none provided
  const chartData: CampaignData[] = data || [
    { name: "Summer Sale", spend: 12000, sales: 36000, roas: 3.0, conversionRate: 2.5 },
    { name: "New Collection", spend: 8500, sales: 21250, roas: 2.5, conversionRate: 1.8 },
    { name: "Holiday Special", spend: 15000, sales: 37500, roas: 2.5, conversionRate: 3.2 },
    { name: "Flash Sale", spend: 5000, sales: 18000, roas: 3.6, conversionRate: 4.1 },
    { name: "Clearance", spend: 6500, sales: 9750, roas: 1.5, conversionRate: 1.2 }
  ];

  // Only sort if we have real data (not placeholder data)
  const sortedByRoas = data 
    ? [...chartData]
        .filter(item => item && item.roas !== undefined) // Filter out undefined ROAS
        .sort((a, b) => (b.roas || 0) - (a.roas || 0))
    : chartData;
    
  const sortedBySpend = data
    ? [...chartData]
        .filter(item => item && item.spend !== undefined) // Filter out undefined spend
        .sort((a, b) => (b.spend || 0) - (a.spend || 0))
    : chartData;
    
  const sortedBySales = data
    ? [...chartData]
        .filter(item => item && item.sales !== undefined) // Filter out undefined sales
        .sort((a, b) => (b.sales || 0) - (a.sales || 0))
    : chartData;

  const sortedByConversion = data
    ? [...chartData]
        .filter(item => item && item.conversionRate !== undefined) // Filter out undefined conversion rate
        .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
    : chartData;

  // Updated color palette to match the reference image
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

  // Function to truncate campaign names for display
  const truncateName = (name: string, maxLength = 15) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          Campaign Performance <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="roas">
          <TabsList className="bg-[#021627]/50 m-4 w-auto">
            <TabsTrigger value="roas">ROAS</TabsTrigger>
            <TabsTrigger value="spend">Spend</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
          </TabsList>
          <TabsContent value="roas" className="h-[300px] px-4 pt-0 pb-4">
            {!hasData ? noDataMessage : (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sortedByRoas} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                    <defs>
                      <linearGradient id="roasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradientColors.roas[0]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={gradientColors.roas[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickFormatter={truncateName}
                      angle={45}
                      textAnchor="start"
                      height={60}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}x`} 
                      domain={[0, Math.max(...sortedByRoas.map(item => item.roas || 0)) * 1.2 || 5]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                      formatter={(value: number) => [`${value.toFixed(2)}x`, "ROAS"]}
                      labelStyle={{ color: "#e0f2f1" }}
                      labelFormatter={(label) => label} // Show full campaign name in tooltip
                    />
                    <ReferenceLine y={3} stroke="#ffcc00" strokeDasharray="3 3" label={{ value: "Target: 3x", fill: "#ffcc00", position: "insideBottomRight" }} />
                    <Area 
                      type="monotone" 
                      dataKey="roas" 
                      name="ROAS" 
                      stroke={colors.roas} 
                      fillOpacity={1}
                      fill="url(#roasGradient)"
                      strokeWidth={3}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </TabsContent>
          <TabsContent value="spend" className="h-[300px] px-4 pt-0 pb-4">
            {!hasData ? noDataMessage : (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sortedBySpend} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradientColors.spend[0]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={gradientColors.spend[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickFormatter={truncateName}
                      angle={45}
                      textAnchor="start"
                      height={60}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value / 1000}k`} 
                      domain={[0, Math.max(...sortedBySpend.map(item => item.spend || 0)) * 1.2 || 20000]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, "Ad Spend"]}
                      labelStyle={{ color: "#e0f2f1" }}
                      labelFormatter={(label) => label} // Show full campaign name in tooltip
                    />
                    <Area 
                      type="monotone" 
                      dataKey="spend" 
                      name="Ad Spend" 
                      stroke={colors.spend}
                      fillOpacity={1}
                      fill="url(#spendGradient)"
                      strokeWidth={3}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </TabsContent>
          <TabsContent value="sales" className="h-[300px] px-4 pt-0 pb-4">
            {!hasData ? noDataMessage : (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sortedBySales} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradientColors.sales[0]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={gradientColors.sales[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickFormatter={truncateName}
                      angle={45}
                      textAnchor="start"
                      height={60}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value / 1000}k`} 
                      domain={[0, Math.max(...sortedBySales.map(item => item.sales || 0)) * 1.2 || 40000]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, "Sales Revenue"]}
                      labelStyle={{ color: "#e0f2f1" }}
                      labelFormatter={(label) => label} // Show full campaign name in tooltip
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      name="Sales Revenue" 
                      stroke={colors.sales}
                      fillOpacity={1}
                      fill="url(#salesGradient)"
                      strokeWidth={3}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </TabsContent>
          <TabsContent value="conversion" className="h-[300px] px-4 pt-0 pb-4">
            {!hasData ? noDataMessage : (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sortedByConversion} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                    <defs>
                      <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={gradientColors.conversion[0]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={gradientColors.conversion[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#e0f2f1" 
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                      tickFormatter={truncateName}
                      angle={45}
                      textAnchor="start"
                      height={60}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(2)}%`} 
                      domain={[0, Math.max(...sortedByConversion.map(item => item.conversionRate || 0)) * 1.2 || 5]} 
                      stroke="#e0f2f1"
                      tick={{ fill: '#e0f2f1', fontSize: 12 }}
                      axisLine={{ stroke: '#37474f' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, "Conversion Rate"]}
                      labelStyle={{ color: "#e0f2f1" }}
                      labelFormatter={(label) => label} // Show full campaign name in tooltip
                    />
                    <Area 
                      type="monotone" 
                      dataKey="conversionRate" 
                      name="Conversion Rate" 
                      stroke={colors.conversion}
                      fillOpacity={1}
                      fill="url(#conversionGradient)"
                      strokeWidth={3}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CampaignPerformanceChart;
