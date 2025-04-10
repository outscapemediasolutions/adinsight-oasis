import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, PieChart, LineChart } from "recharts";
import { 
  Bar, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Line,
  Pie,
  PolarAngleAxis, 
  PolarGrid, 
  PolarRadiusAxis, 
  RadialBar, 
  RadialBarChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  ValueType 
} from "recharts";
import { ShopifyOrderData } from "@/services/shopifyData";
import { Loader2 } from "lucide-react";

// Define color palette for charts
const COLORS = [
  "#9b87f5", // Primary Purple
  "#7E69AB", // Secondary Purple
  "#6E59A5", // Tertiary Purple
  "#D6BCFA", // Light Purple
  "#F97316", // Bright Orange
  "#0EA5E9", // Ocean Blue
  "#D946EF", // Magenta Pink
  "#33C3F0", // Sky Blue
  "#0FA0CE", // Bright Blue
  "#8B5CF6", // Vivid Purple
];

interface OrdersByRegionProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

export const OrdersByRegionChart: React.FC<OrdersByRegionProps> = ({ data, isLoading = false }) => {
  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const regionCounts: Record<string, number> = {};
    
    data.forEach(order => {
      const region = order.shippingProvinceName || order.shippingAddress.province || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    
    return Object.entries(regionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Take top 10 regions
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-adpulse-green/70" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-center text-muted-foreground">
        No data available
      </div>
    );
  }
  
  return (
    <div className="h-[250px]">
      <ChartContainer
        config={{
          count: {
            label: "Orders",
            theme: {
              light: "#7E69AB",
              dark: "#9b87f5",
            },
          },
        }}
      >
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
          />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

interface PaymentMethodChartProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

export const PaymentMethodChart: React.FC<PaymentMethodChartProps> = ({ data, isLoading = false }) => {
  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const methodCounts: Record<string, number> = {};
    
    data.forEach(order => {
      const method = order.paymentMethod || 'Other';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    
    return Object.entries(methodCounts)
      .map(([name, count]) => ({ name, count, percentage: (count / data.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-adpulse-green/70" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-center text-muted-foreground">
        No data available
      </div>
    );
  }
  
  return (
    <div className="h-[250px]">
      <ChartContainer
        config={{
          count: {
            label: "Payment Methods",
            theme: {
              light: "#7E69AB",
              dark: "#9b87f5",
            },
          },
        }}
      >
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            dataKey="count"
            label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [value, 'Orders']}
            labelFormatter={(label) => `Payment Method: ${label}`}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
};

interface DeviceUsageChartProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

export const DeviceUsageChart: React.FC<DeviceUsageChartProps> = ({ data, isLoading = false }) => {
  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const devices: Record<string, number> = {
      'Android': 0,
      'iOS': 0,
      'Windows': 0,
      'Mac': 0,
      'Other': 0
    };
    
    data.forEach(order => {
      let device = 'Other';
      if (order.notes) {
        const userAgent = order.notes.toLowerCase();
        if (userAgent.includes('android')) device = 'Android';
        else if (userAgent.includes('iphone') || userAgent.includes('ipad')) device = 'iOS';
        else if (userAgent.includes('windows')) device = 'Windows';
        else if (userAgent.includes('macintosh')) device = 'Mac';
      }
      devices[device] = (devices[device] || 0) + 1;
    });
    
    // Filter out zero values
    return Object.entries(devices)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-adpulse-green/70" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-center text-muted-foreground">
        No device data available
      </div>
    );
  }
  
  return (
    <div className="h-[250px]">
      <ChartContainer
        config={{
          count: {
            label: "Orders",
            theme: {
              light: "#7E69AB",
              dark: "#9b87f5",
            },
          },
        }}
      >
        <RadialBarChart 
          innerRadius={30} 
          outerRadius={120} 
          data={chartData} 
          barSize={20}
          startAngle={180}
          endAngle={0}
          cx="50%"
          cy="70%"
        >
          <RadialBar
            background
            clockWise
            dataKey="count"
            label={{ position: 'insideStart', fill: '#fff' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </RadialBar>
          <PolarGrid />
          <PolarAngleAxis type="category" dataKey="name" tick={{ fill: '#888' }} />
          <PolarRadiusAxis />
          <Tooltip />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
};

interface TopProductsChartProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data, isLoading = false }) => {
  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const productMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    data.forEach(order => {
      order.lineItems.forEach(item => {
        if (!productMap[item.name]) {
          productMap[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        
        productMap[item.name].quantity += item.quantity;
        productMap[item.name].revenue += item.price * item.quantity;
      });
    });
    
    return Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Top 10 products
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-adpulse-green/70" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-center text-muted-foreground">
        No product data available
      </div>
    );
  }
  
  // Truncate long product names
  const truncateProductName = (name: string, maxLength: number = 25) => {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };
  
  const chartDataWithTruncatedNames = chartData.map(item => ({
    ...item,
    displayName: truncateProductName(item.name)
  }));
  
  return (
    <div className="h-[250px]">
      <ChartContainer
        config={{
          quantity: {
            label: "Quantity Sold",
            theme: {
              light: "#7E69AB",
              dark: "#9b87f5",
            },
          },
          revenue: {
            label: "Revenue",
            theme: {
              light: "#F97316",
              dark: "#F97316",
            },
          }
        }}
      >
        <BarChart 
          data={chartDataWithTruncatedNames} 
          layout="vertical" 
          margin={{ top: 10, right: 10, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis 
            dataKey="displayName" 
            type="category" 
            tickLine={false} 
            axisLine={false} 
            width={100}
          />
          <Tooltip 
            formatter={(value, name) => {
              return name === 'revenue' ? [`₹${value.toFixed(2)}`, 'Revenue'] : [value, 'Quantity Sold'];
            }}
            labelFormatter={(label) => `Product: ${label}`}
          />
          <Legend />
          <Bar dataKey="quantity" name="Quantity Sold" fill="var(--color-quantity)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

interface RevenueOverTimeChartProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

export const RevenueOverTimeChart: React.FC<RevenueOverTimeChartProps> = ({ data, isLoading = false }) => {
  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const dateMap: Record<string, { date: string, revenue: number, orders: number }> = {};
    
    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    sortedData.forEach(order => {
      const date = order.createdAt.split('T')[0]; // YYYY-MM-DD
      
      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          revenue: 0,
          orders: 0
        };
      }
      
      dateMap[date].revenue += order.total;
      dateMap[date].orders += 1;
    });
    
    return Object.values(dateMap);
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-adpulse-green/70" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-center text-muted-foreground">
        No revenue data available
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };
  
  const chartDataWithFormattedDates = chartData.map(item => ({
    ...item,
    formattedDate: formatDate(item.date)
  }));
  
  return (
    <div className="h-[250px]">
      <ChartContainer
        config={{
          revenue: {
            label: "Revenue",
            theme: {
              light: "#9b87f5",
              dark: "#9b87f5",
            },
          },
          orders: {
            label: "Orders",
            theme: {
              light: "#F97316",
              dark: "#F97316",
            },
          }
        }}
      >
        <LineChart 
          data={chartDataWithFormattedDates} 
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="formattedDate"
            tickLine={false} 
            axisLine={false}
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            yAxisId="revenue"
            orientation="left"
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `₹${value}`}
          />
          <YAxis 
            yAxisId="orders"
            orientation="right"
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: ValueType, name: string) => {
              return name === 'revenue' ? 
                [`₹${typeof value === 'number' ? value.toFixed(2) : value}`, 'Revenue'] : 
                [value, 'Orders'];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line 
            yAxisId="revenue"
            type="monotone" 
            dataKey="revenue" 
            name="Revenue" 
            stroke="var(--color-revenue)" 
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
          <Line 
            yAxisId="orders"
            type="monotone" 
            dataKey="orders" 
            name="Orders" 
            stroke="var(--color-orders)" 
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
};

interface FulfillmentSpeedChartProps {
  data: ShopifyOrderData[];
  isLoading?: boolean;
}

export const FulfillmentSpeedChart: React.FC<FulfillmentSpeedChartProps> = ({ data, isLoading = false }) => {
  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter orders with both created and fulfilled dates
    const fulfillmentData = data.filter(order => 
      order.createdAt && order.fulfilledAt && order.fulfillmentStatus === 'fulfilled'
    );
    
    if (fulfillmentData.length === 0) return [];
    
    // Calculate time differences in hours
    const hoursBuckets: Record<string, number> = {
      'Under 24h': 0,
      '24-48h': 0,
      '2-3 days': 0,
      '3-7 days': 0,
      'Over 7 days': 0
    };
    
    fulfillmentData.forEach(order => {
      const createdDate = new Date(order.createdAt);
      const fulfilledDate = new Date(order.fulfilledAt as string);
      const diffHours = (fulfilledDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        hoursBuckets['Under 24h']++;
      } else if (diffHours < 48) {
        hoursBuckets['24-48h']++;
      } else if (diffHours < 72) {
        hoursBuckets['2-3 days']++;
      } else if (diffHours < 168) {
        hoursBuckets['3-7 days']++;
      } else {
        hoursBuckets['Over 7 days']++;
      }
    });
    
    // Convert to chart format
    return Object.entries(hoursBuckets)
      .map(([name, count]) => ({ name, count }))
      .filter(item => item.count > 0);
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <Loader2 className="h-8 w-8 animate-spin text-adpulse-green/70" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-center text-muted-foreground">
        No fulfillment data available
      </div>
    );
  }
  
  return (
    <div className="h-[250px]">
      <ChartContainer
        config={{
          count: {
            label: "Orders",
            theme: {
              light: "#9b87f5",
              dark: "#9b87f5",
            },
          }
        }}
      >
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
          />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip 
            formatter={(value: ValueType) => [value, 'Orders']}
            labelFormatter={(label) => `Fulfillment Time: ${label}`}
          />
          <Bar 
            dataKey="count" 
            name="Orders" 
            fill="var(--color-count)" 
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};
