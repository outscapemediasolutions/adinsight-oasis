
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
  Area,
  Cell
} from "recharts";
import { format, parse } from "date-fns";
import React, { useMemo } from "react";

interface PerformanceChartProps {
  title: string;
  description?: string;
  data: AdData[];
  type: 'spendVsRevenue' | 'roas' | 'ctr' | 'cvr' | 'cpcVsCpa';
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

// Format currency values
const formatCurrency = (value: number) => {
  return `₹${value.toFixed(2)}`;
};

// Format percentage values
const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

// Helper to truncate campaign names for display
const truncateName = (name: string, maxLength = 18) => {
  return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
};

// Helper to determine color based on CTR value
const getCTRColor = (ctr: number) => {
  if (ctr >= 2) return "#6fe394"; // high - green
  if (ctr >= 1) return "#ffcc00"; // medium - gold
  return "#ff5252"; // low - red
};

// Helper to determine color based on CVR value
const getCVRColor = (cvr: number) => {
  if (cvr >= 3) return "#6fe394"; // high - green  
  if (cvr >= 1.5) return "#ffcc00"; // medium - gold
  return "#ff5252"; // low - red
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
    if (type === 'ctr' || type === 'cvr') {
      const campaignData = new Map();
      
      data.forEach(item => {
        if (!campaignData.has(item.campaignName)) {
          campaignData.set(item.campaignName, {
            name: item.campaignName,
            fullName: item.campaignName, // Store full name for tooltip
            impressions: 0,
            clicks: 0,
            results: 0,
            ctr: 0,
            conversionRate: 0
          });
        }
        
        const campaign = campaignData.get(item.campaignName);
        campaign.impressions += item.impressions || 0;
        campaign.clicks += item.linkClicks || 0;
        
        // Only count results if there's a valid result type
        if (item.resultType && item.resultType.trim() !== '') {
          campaign.results += item.results || 0;
        }
      });
      
      // Calculate CTR and conversion rate for each campaign
      campaignData.forEach(campaign => {
        campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
        campaign.conversionRate = campaign.clicks > 0 ? (campaign.results / campaign.clicks) * 100 : 0;
      });
      
      const processedData = Array.from(campaignData.values());
      console.log(`Processed campaign data, resulting in ${processedData.length} campaigns`);
      
      // Ensure at least one data point exists
      if (processedData.length === 0) {
        return [{ name: 'No Data', fullName: 'No Data', ctr: 0, conversionRate: 0 }];
      }
      
      // Sort by CTR or Conversion Rate depending on the chart type
      return processedData.sort((a, b) => {
        return type === 'ctr' 
          ? b.ctr - a.ctr 
          : b.conversionRate - a.conversionRate;
      });
    }
    
    // Default empty data
    return [{ date: 'No Data', value: 0 }];
  }, [data, type]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Render different charts based on type
  const renderChart = () => {
    // If no data, show a message
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No data available for selected period
        </div>
      );
    }
    
    switch (type) {
      case 'spendVsRevenue':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff9800" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6fe394" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6fe394" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 12 }} 
                axisLine={{ stroke: '#37474f' }}
                angle={45}
                textAnchor="start"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => `₹${value / 1000}k`}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 12 }}
                axisLine={{ stroke: '#37474f' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'spent' ? 'Ad Spend' : 'Sales Revenue'
                ]}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                labelStyle={{ color: "#e0f2f1" }}
              />
              <Legend 
                formatter={(value) => value === 'spent' ? 'Ad Spend' : 'Sales Revenue'} 
                wrapperStyle={{ bottom: 0 }}
              />
              <Area 
                type="monotone" 
                dataKey="spent" 
                name="spent"
                stroke="#ff9800" 
                fill="url(#spendGradient)"
                strokeWidth={2}
                connectNulls={true}
                isAnimationActive={true}
                yAxisId="left"
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                name="sales"
                stroke="#6fe394" 
                fill="url(#salesGradient)"
                strokeWidth={2}
                connectNulls={true}
                isAnimationActive={true}
                yAxisId="left"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'roas':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 12 }} 
                axisLine={{ stroke: '#37474f' }}
                angle={45}
                textAnchor="start"
                height={60}
              />
              <YAxis 
                tickFormatter={(value) => `${value}x`}
                domain={[0, Math.max(...chartData.map(d => d.roas || 0)) * 1.2 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 12 }}
                axisLine={{ stroke: '#37474f' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}x`, 'ROAS']}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                labelStyle={{ color: "#e0f2f1" }}
              />
              <Legend />
              <ReferenceLine 
                y={3} 
                stroke="#ffcc00" 
                strokeDasharray="3 3" 
                label={{ 
                  value: 'Target ROAS (3x)', 
                  fill: '#ffcc00', 
                  position: 'insideBottomRight' 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="roas" 
                name="ROAS" 
                stroke="#ffcc00" 
                strokeWidth={3}
                dot={{ fill: '#ffcc00', stroke: '#ffcc00', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'ctr':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 150, bottom: 5 }}
              barGap={8}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#37474f" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, Math.max(...chartData.map(d => d.ctr || 0)) * 1.2 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 12 }}
                axisLine={{ stroke: '#37474f' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 12 }} 
                axisLine={{ stroke: '#37474f' }}
                width={150}
                tickMargin={5}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'CTR']}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                labelStyle={{ color: "#e0f2f1" }}
                labelFormatter={(name) => {
                  const item = chartData.find(d => d.name === name);
                  return item?.fullName || name;
                }}
              />
              <Legend />
              <Bar 
                dataKey="ctr" 
                name="CTR" 
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCTRColor(entry.ctr)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'cvr':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 150, bottom: 5 }}
              barGap={8}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#37474f" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, Math.max(...chartData.map(d => d.conversionRate || 0)) * 1.2 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 12 }}
                axisLine={{ stroke: '#37474f' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 12 }} 
                axisLine={{ stroke: '#37474f' }}
                width={150}
                tickMargin={5}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Conversion Rate']}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                labelStyle={{ color: "#e0f2f1" }}
                labelFormatter={(name) => {
                  const item = chartData.find(d => d.name === name);
                  return item?.fullName || name;
                }}
              />
              <Legend />
              <Bar 
                dataKey="conversionRate" 
                name="Conversion Rate" 
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCVRColor(entry.conversionRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'cpcVsCpa':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 12 }} 
                axisLine={{ stroke: '#37474f' }}
                angle={45}
                textAnchor="start"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={formatCurrency}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 12 }}
                axisLine={{ stroke: '#37474f' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'cpc' ? 'Cost per Click' : 'Cost per Result'
                ]}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px" }}
                labelStyle={{ color: "#e0f2f1" }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cpc" 
                name="CPC" 
                stroke="#4dabf5" 
                strokeWidth={2}
                dot={{ fill: '#4dabf5', stroke: '#4dabf5', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                connectNulls={true}
                isAnimationActive={true}
              />
              <Line 
                type="monotone" 
                dataKey="costPerResult" 
                name="CPA" 
                stroke="#ff9800" 
                strokeWidth={2}
                dot={{ fill: '#ff9800', stroke: '#ff9800', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                connectNulls={true}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div>Chart type not supported</div>;
    }
  };
  
  return (
    <Card className="bg-[#0B2537] border-white/10">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default React.memo(PerformanceChart);
