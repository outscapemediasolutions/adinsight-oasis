
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Scatter, ScatterChart, Cell, PieChart, Pie } from "recharts";
import { AdData, getDataByDate, calculateMetrics } from "@/services/data";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartProps {
  title: string;
  description?: string;
  data: AdData[];
  type: "spendVsRevenue" | "roas" | "cpcVsCpa" | "ordersVsVisitors" | "ctr" | "cvr" | "campaign" | "adSet" | "custom";
  height?: number;
  className?: string;
  isLoading?: boolean;
  dateFormat?: string;
}

const PerformanceChart = ({ 
  title, 
  description, 
  data, 
  type, 
  height = 300, 
  className, 
  isLoading = false,
  dateFormat = "MMM d"
}: ChartProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Process data based on chart type
  useEffect(() => {
    if (data.length === 0 || isLoading) return;
    
    switch (type) {
      case "spendVsRevenue": {
        const dataByDate = getDataByDate(data);
        const processedData = dataByDate.map(item => ({
          date: item.date,
          spend: item.metrics.totalSpend,
          revenue: item.metrics.totalSales,
          profit: item.metrics.totalSales - item.metrics.totalSpend,
        }));
        setChartData(processedData);
        break;
      }
      case "roas": {
        const dataByDate = getDataByDate(data);
        const processedData = dataByDate.map(item => ({
          date: item.date,
          roas: item.metrics.roas,
          target: 3.0, // Target ROAS line
        }));
        setChartData(processedData);
        break;
      }
      case "cpcVsCpa": {
        const dataByDate = getDataByDate(data);
        const processedData = dataByDate.map(item => ({
          date: item.date,
          cpc: item.metrics.cpc,
          cpa: item.metrics.costPerResult,
        }));
        setChartData(processedData);
        break;
      }
      case "ordersVsVisitors": {
        const dataByDate = getDataByDate(data);
        const processedData = dataByDate.map(item => ({
          date: item.date,
          orders: item.metrics.totalOrders,
          visitors: item.metrics.totalVisitors,
          conversionRate: item.metrics.cvr,
        }));
        setChartData(processedData);
        break;
      }
      case "ctr": {
        // Group by campaign and calculate average CTR
        const campaigns = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!campaigns.has(item.campaignName)) {
            campaigns.set(item.campaignName, []);
          }
          campaigns.get(item.campaignName)?.push(item);
        });
        
        const processedData = Array.from(campaigns.entries()).map(([campaign, items]) => {
          const metrics = calculateMetrics(items);
          return {
            campaign: campaign.length > 20 ? campaign.substring(0, 20) + "..." : campaign,
            ctr: metrics.ctr,
          };
        }).sort((a, b) => b.ctr - a.ctr);
        
        setChartData(processedData);
        break;
      }
      case "cvr": {
        // Group by campaign and calculate average CVR
        const campaigns = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!campaigns.has(item.campaignName)) {
            campaigns.set(item.campaignName, []);
          }
          campaigns.get(item.campaignName)?.push(item);
        });
        
        const processedData = Array.from(campaigns.entries()).map(([campaign, items]) => {
          const metrics = calculateMetrics(items);
          return {
            campaign: campaign.length > 20 ? campaign.substring(0, 20) + "..." : campaign,
            cvr: metrics.cvr,
            spend: metrics.totalSpend,
          };
        }).sort((a, b) => b.cvr - a.cvr);
        
        setChartData(processedData);
        break;
      }
      default:
        setChartData([]);
    }
  }, [data, type, isLoading]);

  // Render appropriate chart based on type
  const renderChart = () => {
    if (isLoading) {
      return <Skeleton className="w-full h-full" />;
    }
    
    if (data.length === 0 || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      );
    }
    
    switch (type) {
      case "spendVsRevenue":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
              <YAxis yAxisId="left" stroke="#e0f2f1" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f" }}
                formatter={(value: number) => [`₹${value.toFixed(2)}`, ""]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="spend" name="Ad Spend" fill="#ff9800" barSize={20} />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#6fe394" barSize={20} />
              <Line yAxisId="left" dataKey="profit" name="Profit" stroke="#00bcd4" strokeWidth={2} dot={{ fill: "#00bcd4", r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case "roas":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
              <YAxis stroke="#e0f2f1" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f" }}
                formatter={(value: number) => [`${value.toFixed(2)}x`, ""]}
              />
              <Legend />
              <Line type="monotone" dataKey="roas" name="ROAS" stroke="#6fe394" strokeWidth={3} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="target" name="Target ROAS" stroke="#ffcc00" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        );
      case "cpcVsCpa":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
              <YAxis stroke="#e0f2f1" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f" }}
                formatter={(value: number) => [`₹${value.toFixed(2)}`, ""]}
              />
              <Legend />
              <Line type="monotone" dataKey="cpc" name="Cost per Click" stroke="#00bcd4" strokeWidth={2} dot={{ fill: "#00bcd4", r: 4 }} />
              <Line type="monotone" dataKey="cpa" name="Cost per Acquisition" stroke="#ff9800" strokeWidth={2} dot={{ fill: "#ff9800", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "ordersVsVisitors":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
              <YAxis yAxisId="left" stroke="#e0f2f1" />
              <YAxis yAxisId="right" orientation="right" stroke="#e0f2f1" />
              <Tooltip contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f" }} />
              <Legend />
              <Bar yAxisId="left" dataKey="visitors" name="Website Visitors" fill="#00bcd4" barSize={20} />
              <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#6fe394" barSize={20} />
              <Line yAxisId="right" dataKey="conversionRate" name="Conversion Rate (%)" stroke="#ffcc00" strokeWidth={2} dot={{ fill: "#ffcc00", r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case "ctr":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#e0f2f1" domain={[0, 'auto']} tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <YAxis dataKey="campaign" type="category" width={120} tick={{ fontSize: 12 }} stroke="#e0f2f1" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f" }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, "CTR"]}
              />
              <Bar dataKey="ctr" name="Click-Through Rate">
                {chartData.map((entry, index) => {
                  let color = "#6fe394"; // High CTR (green)
                  if (entry.ctr < 1) {
                    color = "#ff5252"; // Low CTR (red)
                  } else if (entry.ctr < 2) {
                    color = "#ffcc00"; // Medium CTR (gold)
                  }
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "cvr":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis dataKey="campaign" stroke="#e0f2f1" tick={{ fontSize: 11 }} tickLine={false} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#e0f2f1" domain={[0, 'auto']} tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e2a38", border: "1px solid #37474f" }}
                formatter={(value: number, name) => {
                  if (name === "cvr") return [`${value.toFixed(2)}%`, "Conversion Rate"];
                  if (name === "spend") return [`₹${value.toFixed(2)}`, "Ad Spend"];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="cvr" name="Conversion Rate" fill="#6fe394" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Chart type not supported</p>
          </div>
        );
    }
  };

  return (
    <Card className={cn("chart-container", className)}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-60px)]">
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
