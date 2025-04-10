
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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
  
  // Customer Behavior Data (sample - would be replaced with real data)
  const customerBehaviorData = [
    { category: "New Customers", value: 65 },
    { category: "Returning Customers", value: 35 },
  ];
  
  // Product Category Performance (sample - would be replaced with real data)
  const categoryPerformanceData = [
    { category: "Clothing", sales: 65, profit: 45, returns: 12 },
    { category: "Electronics", sales: 45, profit: 30, returns: 8 },
    { category: "Home Goods", sales: 35, profit: 25, returns: 5 },
    { category: "Accessories", sales: 30, profit: 20, returns: 3 },
    { category: "Books", sales: 25, profit: 15, returns: 2 },
  ];
  
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
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Behavior</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerBehaviorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {customerBehaviorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, "Percentage"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Product Category Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryPerformanceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis angle={30} />
                <Radar 
                  name="Sales" 
                  dataKey="sales" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.6} 
                />
                <Radar 
                  name="Profit" 
                  dataKey="profit" 
                  stroke="#0EA5E9" 
                  fill="#0EA5E9" 
                  fillOpacity={0.6} 
                />
                <Radar 
                  name="Returns" 
                  dataKey="returns" 
                  stroke="#F97316" 
                  fill="#F97316" 
                  fillOpacity={0.6} 
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
