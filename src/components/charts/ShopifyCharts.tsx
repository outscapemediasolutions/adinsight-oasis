
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatChartLabel } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface ShopifyChartsProps {
  metrics: {
    topProducts: { name: string; quantity: number; revenue: number }[];
    salesByDay: { date: string; orders: number; revenue: number }[];
  } | null;
  isLoading: boolean;
}

export const ShopifyCharts = ({ metrics, isLoading }: ShopifyChartsProps) => {
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">("daily");
  
  if (isLoading) {
    return (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-[250px] w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-[250px] w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!metrics) {
    return null;
  }
  
  // Prepare data for sales performance chart
  const salesData = metrics.salesByDay || [];
  
  // Prepare data for top products chart
  const topProductsData = (metrics.topProducts || [])
    .slice(0, 5)
    .map(product => ({
      name: formatChartLabel(product.name, 20),
      revenue: parseFloat(product.revenue.toFixed(2)),
      quantity: product.quantity
    }));

  // Colors for charts
  const COLORS = [
    "#8B5CF6", // Vivid purple
    "#D946EF", // Magenta pink
    "#F97316", // Bright orange
    "#0EA5E9", // Ocean blue
    "#10B981", // Emerald green
    "#6366F1", // Indigo
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F59E0B", // Amber
    "#6D28D9", // Purple
  ];
  
  // Process sales by day of week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const salesByDayOfWeek = salesData.reduce((acc, item) => {
    const date = new Date(item.date);
    const dayOfWeek = daysOfWeek[date.getDay()];
    
    if (!acc[dayOfWeek]) {
      acc[dayOfWeek] = {
        day: dayOfWeek,
        revenue: 0,
        orders: 0,
        count: 0
      };
    }
    
    acc[dayOfWeek].revenue += item.revenue;
    acc[dayOfWeek].orders += item.orders;
    acc[dayOfWeek].count += 1;
    
    return acc;
  }, {} as Record<string, { day: string; revenue: number; orders: number; count: number }>);
  
  // Calculate averages and format for chart
  const weekDaySalesData = daysOfWeek.map(day => {
    const data = salesByDayOfWeek[day] || { day, revenue: 0, orders: 0, count: 1 };
    return {
      day,
      revenue: data.revenue,
      avgRevenue: data.revenue / (data.count || 1),
      orders: data.orders,
      avgOrders: data.orders / (data.count || 1)
    };
  });
  
  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>
              
              <TabsContent value="revenue" className="space-y-2">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={salesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8B5CF6"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="orders" className="space-y-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={salesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value, "Orders"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="orders" fill="#D946EF" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topProductsData}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#0EA5E9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Weekly Sales Performance</CardTitle>
          <p className="text-sm text-muted-foreground">Sales distribution by days of the week</p>
        </CardHeader>
        <CardContent className="pt-2">
          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="average">Average</TabsTrigger>
            </TabsList>
            
            <TabsContent value="revenue" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weekDaySalesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10B981" name="Total Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="orders" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weekDaySalesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#F97316" name="Total Orders" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="average" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weekDaySalesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" tickFormatter={(value) => `$${value}`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "Average Revenue") {
                        return [`$${value.toFixed(2)}`, name];
                      }
                      return [value.toFixed(2), name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgRevenue" yAxisId="left" fill="#6366F1" name="Average Revenue" />
                  <Bar dataKey="avgOrders" yAxisId="right" fill="#EC4899" name="Average Orders" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
