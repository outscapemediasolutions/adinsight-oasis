
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
        return [{ name: 'No Data', ctr: 0, conversionRate: 0 }];
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
            <AreaChart data={chartData} margin={{ top: 0, right: 5, left: -10, bottom: 20 }}>
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
                tick={{ fill: '#e0f2f1', fontSize: 11 }} 
                axisLine={{ stroke: '#37474f' }}
                angle={45}
                textAnchor="start"
                height={50}
                tickSize={3}
                tickMargin={3}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => `₹${value / 1000}k`}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 11 }}
                axisLine={{ stroke: '#37474f' }}
                tickSize={3}
                tickMargin={2}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'spent' ? 'Ad Spend' : 'Sales Revenue'
                ]}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px", padding: "4px 8px" }}
                labelStyle={{ color: "#e0f2f1", marginBottom: "2px" }}
                cursor={{ stroke: '#37474f', strokeWidth: 1 }}
              />
              <Legend 
                formatter={(value) => value === 'spent' ? 'Ad Spend' : 'Sales Revenue'} 
                wrapperStyle={{ fontSize: 11, marginTop: -10 }}
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
                activeDot={{ r: 4, stroke: '#ff9800', strokeWidth: 1 }}
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
                activeDot={{ r: 4, stroke: '#6fe394', strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'roas':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 0, right: 5, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 11 }} 
                axisLine={{ stroke: '#37474f' }}
                angle={45}
                textAnchor="start"
                height={50}
                tickSize={3}
                tickMargin={3}
              />
              <YAxis 
                tickFormatter={(value) => `${value}x`}
                domain={[0, Math.max(...chartData.map(d => d.roas || 0)) * 1.2 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 11 }}
                axisLine={{ stroke: '#37474f' }}
                tickSize={3}
                tickMargin={2}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}x`, 'ROAS']}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px", padding: "4px 8px" }}
                labelStyle={{ color: "#e0f2f1", marginBottom: "2px" }}
                cursor={{ stroke: '#37474f', strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, marginTop: -10 }} />
              <ReferenceLine 
                y={3} 
                stroke="#ffcc00" 
                strokeDasharray="3 3" 
                label={{ 
                  value: '3x', 
                  fill: '#ffcc00', 
                  position: 'insideBottomRight',
                  fontSize: 10
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="roas" 
                name="ROAS" 
                stroke="#ffcc00" 
                strokeWidth={2}
                dot={{ fill: '#ffcc00', stroke: '#ffcc00', strokeWidth: 1, r: 3 }}
                activeDot={{ r: 5 }}
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
              margin={{ top: 0, right: 5, left: 110, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#37474f" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, Math.max(...chartData.map(d => d.ctr || 0)) * 1.2 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 11 }}
                axisLine={{ stroke: '#37474f' }}
                tickSize={3}
                tickMargin={2}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 11 }} 
                axisLine={{ stroke: '#37474f' }}
                width={110}
                tickSize={3}
                tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'CTR']}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px", padding: "4px 8px" }}
                labelStyle={{ color: "#e0f2f1", marginBottom: "2px" }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                labelFormatter={(label) => label} // Show full campaign name in tooltip
              />
              <Legend wrapperStyle={{ fontSize: 11, marginTop: -5 }} />
              <Bar 
                dataKey="ctr" 
                name="CTR" 
                fill="#4dabf5"
                isAnimationActive={true}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'cvr':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 0, right: 5, left: 110, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#37474f" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={[0, Math.max(...chartData.map(d => d.conversionRate || 0)) * 1.2 || 4]}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 11 }}
                axisLine={{ stroke: '#37474f' }}
                tickSize={3}
                tickMargin={2}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 11 }} 
                axisLine={{ stroke: '#37474f' }}
                width={110}
                tickSize={3}
                tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Conversion Rate']}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px", padding: "4px 8px" }}
                labelStyle={{ color: "#e0f2f1", marginBottom: "2px" }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                labelFormatter={(label) => label} // Show full campaign name in tooltip
              />
              <Legend wrapperStyle={{ fontSize: 11, marginTop: -5 }} />
              <Bar 
                dataKey="conversionRate" 
                name="Conversion Rate" 
                fill="#6fe394"
                isAnimationActive={true}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'cpcVsCpa':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 0, right: 5, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#e0f2f1" 
                tick={{ fill: '#e0f2f1', fontSize: 11 }} 
                axisLine={{ stroke: '#37474f' }}
                angle={45}
                textAnchor="start"
                height={50}
                tickSize={3}
                tickMargin={3}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={formatCurrency}
                stroke="#e0f2f1"
                tick={{ fill: '#e0f2f1', fontSize: 11 }}
                axisLine={{ stroke: '#37474f' }}
                tickSize={3}
                tickMargin={2}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'cpc' ? 'Cost per Click' : 'Cost per Result'
                ]}
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f", borderRadius: "4px", padding: "4px 8px" }}
                labelStyle={{ color: "#e0f2f1", marginBottom: "2px" }}
                cursor={{ stroke: '#37474f', strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, marginTop: -10 }} />
              <Line 
                type="monotone" 
                dataKey="cpc" 
                name="CPC" 
                stroke="#4dabf5" 
                strokeWidth={2}
                dot={{ fill: '#4dabf5', stroke: '#4dabf5', strokeWidth: 1, r: 3 }}
                activeDot={{ r: 5 }}
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
                dot={{ fill: '#ff9800', stroke: '#ff9800', strokeWidth: 1, r: 3 }}
                activeDot={{ r: 5 }}
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
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-white text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-2">
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default React.memo(PerformanceChart);
