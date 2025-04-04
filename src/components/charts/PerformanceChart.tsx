
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdData, groupByDate } from "@/services/data";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import { format, parse } from "date-fns";
import React, { useMemo } from "react";

interface PerformanceChartProps {
  title: string;
  description?: string;
  data: AdData[];
  type: 'spendVsRevenue' | 'roas' | 'ctr' | 'cvr' | 'cpcVsCpa' | 'campaign';
  height?: number;
  isLoading?: boolean;
}

// Helper to format date for better display
const formatDate = (dateStr: string) => {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'MMM dd');
  } catch (error) {
    console.error("Date parsing error:", error);
    return dateStr;
  }
};

// Format campaign/ad names for display
const formatName = (name: string) => {
  if (!name) return "";
  
  const parts = name.split(/\s*\|\s*/);
  if (parts.length > 1) {
    return `${parts[0]} | ${parts[1].substring(0, 3)}`;
  }
  
  return name.length > 15 ? name.substring(0, 12) + "..." : name;
};

// Format currency values
const formatCurrency = (value: number) => {
  return `₹${value.toFixed(2)}`;
};

// Format percentage values
const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const PerformanceChart = ({ 
  title, 
  description, 
  data, 
  type,
  height = 300,
  isLoading = false
}: PerformanceChartProps) => {
  console.log(`Rendering PerformanceChart of type ${type} with ${data.length} data points`);

  // Define chart colors
  const colors = {
    spend: "#ff9800",
    sales: "#6fe394",
    roas: "#ffcc00",
    ctr: "#4dabf5",
    cpc: "#4dabf5",
    cpa: "#ff9800",
    conversion: "#6fe394"
  };

  // Processed data for chart
  const chartData = useMemo(() => {
    // Group data by date
    if (type === 'spendVsRevenue' || type === 'roas' || type === 'cpcVsCpa') {
      const dailyData = groupByDate(data);
      console.log(`Grouped data by date, resulting in ${dailyData.length} data points`);
      
      // Ensure at least one data point exists
      if (dailyData.length === 0) {
        return [{ date: 'No Data', spent: 0, sales: 0, roas: 0, cpc: 0, ctr: 0, conversionRate: 0, costPerResult: 0 }];
      }
      
      return dailyData.map(day => ({
        ...day,
        formattedDate: formatDate(day.date)
      }));
    } 
    
    // For CTR and CVR by campaign
    if (type === 'ctr' || type === 'cvr' || type === 'campaign') {
      const campaignData = new Map();
      
      data.forEach(item => {
        if (!campaignData.has(item.campaignName)) {
          campaignData.set(item.campaignName, {
            name: item.campaignName,
            impressions: 0,
            clicks: 0,
            results: 0,
            ctr: 0,
            conversionRate: 0,
            spend: 0,
            sales: 0
          });
        }
        
        const campaign = campaignData.get(item.campaignName);
        campaign.impressions += item.impressions || 0;
        campaign.clicks += item.linkClicks || 0;
        campaign.spend += item.amountSpent || 0;
        campaign.sales += item.purchasesValue || 0; // Changed from non-existent 'sales' to 'purchasesValue'
        
        // Only count results if there's a valid result type
        if (item.resultType && item.resultType.trim() !== '') {
          campaign.results += item.results || 0;
        }
      });
      
      // Calculate metrics for each campaign
      campaignData.forEach(campaign => {
        campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
        campaign.conversionRate = campaign.clicks > 0 ? (campaign.results / campaign.clicks) * 100 : 0;
        campaign.roas = campaign.spend > 0 ? campaign.sales / campaign.spend : 0;
      });
      
      const processedData = Array.from(campaignData.values());
      console.log(`Processed campaign data, resulting in ${processedData.length} campaigns`);
      
      // Ensure at least one data point exists
      if (processedData.length === 0) {
        return [{ name: 'No Data', ctr: 0, conversionRate: 0, spend: 0, sales: 0 }];
      }
      
      return processedData;
    }
    
    // Default empty data
    return [{ date: 'No Data', value: 0 }];
  }, [data, type]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-2">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Custom tooltip component for better formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-[#0B2537] border border-white/10 rounded-md p-2 shadow-lg text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-2 mb-1">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-mono">
              {entry.name.includes('CTR') || entry.name.includes('Rate')
                ? formatPercentage(entry.value)
                : entry.name.includes('ROAS')
                ? `${entry.value.toFixed(2)}x`
                : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // For vertical bar charts like CTR/CVR
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const fullName = label;
    const formattedName = formatName(label);
    
    return (
      <div className="bg-[#0B2537] border border-white/10 rounded-md p-2 shadow-lg text-xs max-w-[250px]">
        <p className="font-medium mb-1 break-words">{fullName}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-2 mb-1">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-mono">
              {entry.name.includes('CTR') || entry.name.includes('Rate')
                ? formatPercentage(entry.value)
                : entry.name.includes('ROAS')
                ? `${entry.value.toFixed(2)}x`
                : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  // Render different charts based on type
  const renderChart = () => {
    // If no data, show a message
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data available for selected period
        </div>
      );
    }
    
    switch (type) {
      case 'spendVsRevenue':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart 
              data={chartData} 
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.spend} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors.spend} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.sales} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors.sales} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 10 }} 
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                padding={{ left: 0, right: 0 }}
                height={25}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => `₹${value/1000}k`}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
              />
              <Area 
                type="monotone" 
                dataKey="spent" 
                name="Ad Spend"
                stroke={colors.spend} 
                fill="url(#spendGradient)"
                strokeWidth={2}
                connectNulls={true}
                yAxisId="left"
                activeDot={{ r: 4, strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                name="Sales Revenue"
                stroke={colors.sales} 
                fill="url(#salesGradient)"
                strokeWidth={2}
                connectNulls={true}
                yAxisId="left"
                activeDot={{ r: 4, strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'roas':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 10 }} 
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                padding={{ left: 0, right: 0 }}
                height={25}
              />
              <YAxis 
                tickFormatter={(value) => `${value.toFixed(1)}x`}
                domain={[0, Math.max(...chartData.map(d => d.roas || 0)) * 1.1 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconSize={8}
                iconType="line"
                wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
              />
              <ReferenceLine 
                y={3} 
                stroke={colors.roas} 
                strokeDasharray="3 3" 
                label={{ 
                  value: 'Target 3x', 
                  fill: colors.roas, 
                  fontSize: 10,
                  position: 'insideBottomRight'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="roas" 
                name="ROAS" 
                stroke={colors.roas} 
                strokeWidth={2}
                dot={{ fill: colors.roas, stroke: colors.roas, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 1 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'ctr':
        // Sort by CTR descending for better visibility
        const ctrSortedData = [...chartData].sort((a, b) => (b.ctr || 0) - (a.ctr || 0)).slice(0, 8);
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={ctrSortedData} 
              layout="vertical"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#37474f" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, Math.max(...ctrSortedData.map(d => d.ctr || 0)) * 1.1 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={100}
                tickFormatter={formatName}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                iconSize={8}
                iconType="square"
                wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
              />
              <Bar 
                dataKey="ctr" 
                name="CTR" 
                fill={colors.ctr}
                barSize={15}
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'cvr':
        // Sort by conversion rate descending
        const cvrSortedData = [...chartData].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0)).slice(0, 8);
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={cvrSortedData} 
              layout="vertical"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#37474f" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, Math.max(...cvrSortedData.map(d => d.conversionRate || 0)) * 1.1 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={100}
                tickFormatter={formatName}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                iconSize={8}
                iconType="square"
                wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
              />
              <Bar 
                dataKey="conversionRate" 
                name="Conversion Rate" 
                fill={colors.conversion}
                barSize={15}
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'cpcVsCpa':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 10 }} 
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                padding={{ left: 0, right: 0 }}
                height={25}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => `₹${value.toFixed(0)}`}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconSize={8}
                iconType="line"
                wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="cpc" 
                name="Cost per Click" 
                stroke={colors.cpc} 
                strokeWidth={2}
                dot={{ fill: colors.cpc, stroke: colors.cpc, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 1 }}
                yAxisId="left"
                connectNulls={true}
              />
              <Line 
                type="monotone" 
                dataKey="costPerResult" 
                name="Cost per Acquisition" 
                stroke={colors.cpa} 
                strokeWidth={2}
                dot={{ fill: colors.cpa, stroke: colors.cpa, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 1 }}
                yAxisId="left"
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'campaign':
        // Sort by spend descending
        const spendSortedData = [...chartData].sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 8);
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={spendSortedData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#37474f" />
              <XAxis 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={65}
                tickFormatter={formatName}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => `₹${value/1000}k`}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={40}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value.toFixed(1)}x`}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 10 }}
                axisLine={{ stroke: '#37474f' }}
                tickLine={{ stroke: '#37474f' }}
                width={30}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                iconSize={8}
                wrapperStyle={{ fontSize: 10, paddingTop: 0 }}
              />
              <Bar 
                dataKey="spend" 
                name="Ad Spend" 
                fill={colors.spend}
                yAxisId="left"
                barSize={20} 
                radius={[3, 3, 0, 0]}
              />
              <Bar 
                dataKey="sales" 
                name="Sales Revenue" 
                fill={colors.sales}
                yAxisId="left"
                barSize={20}
                radius={[3, 3, 0, 0]}
              />
              <Line 
                type="monotone" 
                dataKey="roas" 
                name="ROAS" 
                stroke={colors.roas}
                strokeWidth={2}
                dot={{ fill: colors.roas, r: 4 }}
                yAxisId="right"
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div>Chart type not supported</div>;
    }
  };
  
  return (
    <Card className="bg-[#0B2537] border-white/10">
      <CardHeader className="pb-1 pt-2">
        <CardTitle className="text-white text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-1">
        <div className="h-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(PerformanceChart);
