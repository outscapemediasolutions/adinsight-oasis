
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { ArrowUpRight, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, Calendar } from "lucide-react";

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
        <Card className="border border-muted/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-[250px] w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-muted/20 backdrop-blur-sm">
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

  // Enhanced color palette
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
      avgOrders: data.orders / (data.count || 1),
      // Add percentage metrics for better visualization
      percentOfTotalRevenue: data.revenue / (Object.values(salesByDayOfWeek).reduce((sum, d) => sum + d.revenue, 0) || 1) * 100
    };
  });
  
  // Custom tooltip formatter for INR currency
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };
  
  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-indigo-500" />
                Sales Performance
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Daily revenue and order trends</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Filter</span>
            </Button>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="mb-4 bg-muted/50 p-0.5">
                <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
                <TabsTrigger value="area" className="text-xs">Area View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="revenue" className="space-y-2">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={salesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 25,
                    }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ 
                        backgroundColor: "rgba(22, 28, 45, 0.8)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "8px",
                        border: "1px solid rgba(101, 117, 181, 0.2)",
                        color: "#fff"
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8B5CF6"
                      activeDot={{ r: 8, strokeWidth: 0, fill: "#D946EF" }}
                      strokeWidth={2}
                      dot={{ fill: "#8B5CF6", strokeWidth: 0, r: 4 }}
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
                      bottom: 25,
                    }}
                  >
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D946EF" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#D946EF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [value, "Orders"]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ 
                        backgroundColor: "rgba(22, 28, 45, 0.8)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "8px",
                        border: "1px solid rgba(101, 117, 181, 0.2)",
                        color: "#fff"
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="orders" 
                      fill="url(#colorOrders)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="area" className="space-y-2">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={salesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 25,
                    }}
                  >
                    <defs>
                      <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ 
                        backgroundColor: "rgba(22, 28, 45, 0.8)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "8px",
                        border: "1px solid rgba(101, 117, 181, 0.2)",
                        color: "#fff"
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8B5CF6" 
                      fillOpacity={1} 
                      fill="url(#colorRevenueArea)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                Top Products
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Best performing products by revenue</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="text-xs">Details</span>
            </Button>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="bar" className="w-full">
              <TabsList className="mb-4 bg-muted/50 p-0.5">
                <TabsTrigger value="bar" className="text-xs">Bar Chart</TabsTrigger>
                <TabsTrigger value="pie" className="text-xs">Pie Chart</TabsTrigger>
              </TabsList>
              
              <TabsContent value="bar" className="space-y-2">
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
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient
                          key={`gradient-${index}`}
                          id={`colorProduct${index}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `₹${value}`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      contentStyle={{ 
                        backgroundColor: "rgba(22, 28, 45, 0.8)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "8px",
                        border: "1px solid rgba(101, 117, 181, 0.2)",
                        color: "#fff"
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="revenue" 
                      radius={[0, 4, 4, 0]}
                    >
                      {topProductsData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#colorProduct${index % COLORS.length})`} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="pie" className="space-y-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topProductsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="revenue"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {topProductsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      contentStyle={{ 
                        backgroundColor: "rgba(22, 28, 45, 0.8)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "8px",
                        border: "1px solid rgba(101, 117, 181, 0.2)",
                        color: "#fff"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-500" />
              Weekly Sales Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Sales distribution by days of the week</p>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="mb-4 bg-muted/50 p-0.5">
              <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
              <TabsTrigger value="average" className="text-xs">Average</TabsTrigger>
              <TabsTrigger value="percentage" className="text-xs">Distribution</TabsTrigger>
            </TabsList>
            
            <TabsContent value="revenue" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weekDaySalesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 30,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient id="weeklyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => `₹${value}`} 
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{ 
                      backgroundColor: "rgba(22, 28, 45, 0.8)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "8px",
                      border: "1px solid rgba(101, 117, 181, 0.2)",
                      color: "#fff"
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    name="Total Revenue" 
                    fill="url(#weeklyRevenueGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="orders" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weekDaySalesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 30,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient id="weeklyOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(22, 28, 45, 0.8)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "8px",
                      border: "1px solid rgba(101, 117, 181, 0.2)",
                      color: "#fff"
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="orders" 
                    name="Total Orders" 
                    fill="url(#weeklyOrdersGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="average" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={weekDaySalesData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 30,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient id="avgRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="avgOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis 
                    yAxisId="left" 
                    tickFormatter={(value) => `₹${value}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "Average Revenue") {
                        return [formatCurrency(value), name];
                      }
                      return [value.toFixed(2), name];
                    }}
                    contentStyle={{ 
                      backgroundColor: "rgba(22, 28, 45, 0.8)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "8px",
                      border: "1px solid rgba(101, 117, 181, 0.2)",
                      color: "#fff"
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="avgRevenue" 
                    yAxisId="left" 
                    name="Average Revenue" 
                    fill="url(#avgRevenueGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="avgOrders" 
                    yAxisId="right" 
                    name="Average Orders" 
                    fill="url(#avgOrdersGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="percentage" className="space-y-2">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={weekDaySalesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="day"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {weekDaySalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{ 
                      backgroundColor: "rgba(22, 28, 45, 0.8)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "8px",
                      border: "1px solid rgba(101, 117, 181, 0.2)",
                      color: "#fff"
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
