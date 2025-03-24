import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ComposedChart, Area, ReferenceLine, AreaChart
} from "recharts";
import { AdData, calculateMetrics } from "@/services/data";
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, labelFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B2537] border border-white/20 p-3 rounded shadow-md text-white font-poppins">
        <p className="text-xs font-medium mb-1">{labelFormatter ? labelFormatter(label) : label}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center text-xs my-1">
            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.color }}></div>
            <span className="mr-2">{item.name}:</span>
            <span className="font-medium">
              {typeof item.value === 'number' ? 
                (item.unit === '₹' ? 
                  `₹${item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                  item.unit === '%' ? 
                    `${item.value.toFixed(2)}%` : 
                    item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                ) : 
                item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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
  
  // Custom gradient colors
  const greenGradientId = `greenGradient-${Math.random().toString(36).substring(2, 9)}`;
  const blueGradientId = `blueGradient-${Math.random().toString(36).substring(2, 9)}`;
  const orangeGradientId = `orangeGradient-${Math.random().toString(36).substring(2, 9)}`;
  
  // Process data based on chart type
  useEffect(() => {
    if (data.length === 0 || isLoading) return;
    
    switch (type) {
      case "spendVsRevenue": {
        // Group by date
        const dateMap = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!dateMap.has(item.date)) {
            dateMap.set(item.date, []);
          }
          dateMap.get(item.date)?.push(item);
        });
        
        // Calculate metrics for each date
        const processedData = Array.from(dateMap.entries())
          .map(([date, items]) => {
            // Sum up values for the date
            const spend = items.reduce((sum, item) => sum + (item.amountSpent || 0), 0);
            const revenue = items.reduce((sum, item) => sum + (item.purchasesValue || 0), 0);
            
            return {
              date,
              spend,
              revenue,
              profit: revenue - spend
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setChartData(processedData);
        break;
      }
      case "roas": {
        // Group by date
        const dateMap = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!dateMap.has(item.date)) {
            dateMap.set(item.date, []);
          }
          dateMap.get(item.date)?.push(item);
        });
        
        // Calculate ROAS for each date
        const processedData = Array.from(dateMap.entries())
          .map(([date, items]) => {
            // Get weighted average ROAS based on spend
            const totalSpend = items.reduce((sum, item) => sum + (item.amountSpent || 0), 0);
            
            if (totalSpend === 0) return { date, roas: 0, target: 3.0 };
            
            const weightedRoas = items.reduce((sum, item) => {
              const spend = item.amountSpent || 0;
              const weight = totalSpend > 0 ? spend / totalSpend : 0;
              return sum + ((item.roas || 0) * weight);
            }, 0);
            
            return {
              date,
              roas: weightedRoas,
              target: 3.0 // Target ROAS line
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setChartData(processedData);
        break;
      }
      case "cpcVsCpa": {
        // Group by date
        const dateMap = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!dateMap.has(item.date)) {
            dateMap.set(item.date, []);
          }
          dateMap.get(item.date)?.push(item);
        });
        
        // Calculate metrics for each date
        const processedData = Array.from(dateMap.entries())
          .map(([date, items]) => {
            // Get weighted average CPC and CPA based on spend
            const totalSpend = items.reduce((sum, item) => sum + (item.amountSpent || 0), 0);
            
            if (totalSpend === 0) return { date, cpc: 0, cpa: 0 };
            
            const weightedCpc = items.reduce((sum, item) => {
              const spend = item.amountSpent || 0;
              const weight = totalSpend > 0 ? spend / totalSpend : 0;
              return sum + ((item.cpc || 0) * weight);
            }, 0);
            
            const weightedCpa = items.reduce((sum, item) => {
              const spend = item.amountSpent || 0;
              const weight = totalSpend > 0 ? spend / totalSpend : 0;
              return sum + ((item.costPerResult || 0) * weight);
            }, 0);
            
            return {
              date,
              cpc: weightedCpc,
              cpa: weightedCpa
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setChartData(processedData);
        break;
      }
      case "ordersVsVisitors": {
        // Group by date
        const dateMap = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!dateMap.has(item.date)) {
            dateMap.set(item.date, []);
          }
          dateMap.get(item.date)?.push(item);
        });
        
        // Calculate metrics for each date
        const processedData = Array.from(dateMap.entries())
          .map(([date, items]) => {
            // Sum up values for the date
            const clicks = items.reduce((sum, item) => sum + (item.linkClicks || 0), 0);
            
            // Only count results as orders for sales campaigns
            const orders = items.reduce((sum, item) => {
              if (item.objective?.toLowerCase().includes('sales')) {
                return sum + (item.results || 0);
              }
              return sum;
            }, 0);
            
            // Calculate conversion rate
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
            
            return {
              date,
              clicks,
              orders,
              conversionRate
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        
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
        
        // Calculate CTR for each campaign
        const processedData = Array.from(campaigns.entries())
          .map(([campaign, items]) => {
            // Get weighted average CTR based on impressions
            const totalImpressions = items.reduce((sum, item) => sum + (item.impressions || 0), 0);
            
            if (totalImpressions === 0) return { campaign: campaign.length > 20 ? campaign.substring(0, 20) + "..." : campaign, ctr: 0, impressions: 0 };
            
            const weightedCtr = items.reduce((sum, item) => {
              const impressions = item.impressions || 0;
              const weight = totalImpressions > 0 ? impressions / totalImpressions : 0;
              return sum + ((item.ctr || 0) * weight);
            }, 0);
            
            return {
              campaign: campaign.length > 20 ? campaign.substring(0, 20) + "..." : campaign,
              ctr: weightedCtr,
              impressions: totalImpressions
            };
          })
          .sort((a, b) => b.ctr - a.ctr);
        
        setChartData(processedData);
        break;
      }
      case "cvr": {
        // Group by campaign and calculate conversion metrics
        const campaigns = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!campaigns.has(item.campaignName)) {
            campaigns.set(item.campaignName, []);
          }
          campaigns.get(item.campaignName)?.push(item);
        });
        
        // Calculate conversion rate for each campaign
        const processedData = Array.from(campaigns.entries())
          .map(([campaign, items]) => {
            const totalClicks = items.reduce((sum, item) => sum + (item.linkClicks || 0), 0);
            const totalPurchases = items.reduce((sum, item) => sum + (item.purchases || 0), 0);
            const totalSpend = items.reduce((sum, item) => sum + (item.amountSpent || 0), 0);
            
            // Calculate conversion rate
            const cvr = totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0;
            
            return {
              campaign: campaign.length > 20 ? campaign.substring(0, 20) + "..." : campaign,
              cvr,
              spend: totalSpend
            };
          })
          .sort((a, b) => b.cvr - a.cvr);
        
        setChartData(processedData);
        break;
      }
      case "campaign": {
        // Group by campaign for spend vs revenue
        const campaigns = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!campaigns.has(item.campaignName)) {
            campaigns.set(item.campaignName, []);
          }
          campaigns.get(item.campaignName)?.push(item);
        });
        
        // Calculate metrics for each campaign
        const processedData = Array.from(campaigns.entries())
          .map(([campaign, items]) => {
            const totalSpend = items.reduce((sum, item) => sum + (item.amountSpent || 0), 0);
            const totalRevenue = items.reduce((sum, item) => sum + (item.purchasesValue || 0), 0);
            
            return {
              campaign: campaign.length > 20 ? campaign.substring(0, 20) + "..." : campaign,
              spend: totalSpend,
              revenue: totalRevenue,
              profit: totalRevenue - totalSpend
            };
          })
          .sort((a, b) => b.profit - a.profit);
        
        setChartData(processedData);
        break;
      }
      case "adSet": {
        // Group by ad set for performance metrics
        const adSets = new Map<string, AdData[]>();
        data.forEach(item => {
          if (!adSets.has(item.adSetName)) {
            adSets.set(item.adSetName, []);
          }
          adSets.get(item.adSetName)?.push(item);
        });
        
        // Calculate metrics for each ad set
        const processedData = Array.from(adSets.entries())
          .map(([adSet, items]) => {
            const totalSpend = items.reduce((sum, item) => sum + (item.amountSpent || 0), 0);
            const totalRevenue = items.reduce((sum, item) => sum + (item.purchasesValue || 0), 0);
            const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
            
            return {
              adSet: adSet.length > 20 ? adSet.substring(0, 20) + "..." : adSet,
              spend: totalSpend,
              revenue: totalRevenue,
              roas
            };
          })
          .sort((a, b) => b.roas - a.roas);
        
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
          <div className="relative h-full">
            <svg style={{ height: 0 }}>
              <defs>
                <linearGradient id={greenGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6fe394" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#6fe394" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={orangeGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff9800" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ff9800" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37474f" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
                <YAxis stroke="#e0f2f1" />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => {
                    return [value, name === "spend" ? "Ad Spend" : name === "revenue" ? "Revenue" : "Profit", "₹"];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="spend" name="Ad Spend" stroke="#ff9800" fill={`url(#${orangeGradientId})`} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6fe394" fill={`url(#${greenGradientId})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case "roas":
        return (
          <div className="relative h-full">
            <svg style={{ height: 0 }}>
              <defs>
                <linearGradient id={greenGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6fe394" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#6fe394" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37474f" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
                <YAxis stroke="#e0f2f1" />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => {
                    return [value, name === "roas" ? "ROAS" : "Target ROAS", ""];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="roas" name="ROAS" stroke="#6fe394" fill={`url(#${greenGradientId})`} strokeWidth={3} />
                <ReferenceLine y={3} label={{ value: "Target ROAS (3x)", position: "top", fill: "#ffcc00" }} stroke="#ffcc00" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case "cpcVsCpa":
        return (
          <div className="relative h-full">
            <svg style={{ height: 0 }}>
              <defs>
                <linearGradient id={blueGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#64b5f6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#64b5f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={orangeGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff9800" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ff9800" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37474f" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
                <YAxis stroke="#e0f2f1" />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => {
                    return [value, name === "cpc" ? "Cost per Click" : "Cost per Result", "₹"];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="cpc" name="Cost per Click" stroke="#64b5f6" fill={`url(#${blueGradientId})`} strokeWidth={2} />
                <Area type="monotone" dataKey="cpa" name="Cost per Result" stroke="#ff9800" fill={`url(#${orangeGradientId})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case "ordersVsVisitors":
        return (
          <div className="relative h-full">
            <svg style={{ height: 0 }}>
              <defs>
                <linearGradient id={blueGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#64b5f6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#64b5f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={orangeGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff9800" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ff9800" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37474f" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => value} stroke="#e0f2f1" />
                <YAxis stroke="#e0f2f1" />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => {
                    return [value, name === "clicks" ? "Link Clicks" : name === "orders" ? "Orders" : "Conversion Rate", ""];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="clicks" name="Link Clicks" stroke="#64b5f6" fill={`url(#${blueGradientId})`} strokeWidth={2} />
                <Area type="monotone" dataKey="orders" name="Orders" stroke="#ff9800" fill={`url(#${orangeGradientId})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case "ctr":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#e0f2f1" domain={[0, 'auto']} tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <YAxis dataKey="campaign" type="category" width={120} tick={{ fontSize: 12 }} stroke="#e0f2f1" />
              <Tooltip 
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  return [value, "CTR", "%"];
                }}
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
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  return [value, name === "cvr" ? "Conversion Rate" : "Ad Spend", name === "cvr" ? "%" : "₹"];
                }}
              />
              <Legend />
              <Bar dataKey="cvr" name="Conversion Rate" fill="#6fe394" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "campaign":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474f" />
              <XAxis dataKey="campaign" stroke="#e0f2f1" tick={{ fontSize: 11 }} tickLine={false} angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" stroke="#e0f2f1" />
              <Tooltip 
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  return [value, name === "spend" ? "Ad Spend" : name === "revenue" ? "Revenue" : "Profit", "₹"];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="spend" name="Ad Spend" fill="#ff9800" barSize={20} />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#6fe394" barSize={20} />
              <Line yAxisId="left" dataKey="profit" name="Profit" stroke="#64b5f6" strokeWidth={3} dot={{ fill: "#64b5f6", r: 4 }} />
            </ComposedChart>
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
    <Card className={cn("chart-container font-poppins", className)}>
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
