import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, TooltipProps } from 'recharts';
import { useTheme } from 'next-themes';
import { ShippingMetrics } from '../utils/calculateMetrics';

interface ShippingChartsProps {
  metrics: ShippingMetrics | null;
  isLoading: boolean;
}

export const ShippingCharts = ({ metrics, isLoading }: ShippingChartsProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const textColor = isDark ? '#fff' : '#000';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  const COLORS = ['#9b87f5', '#7E69AB', '#D6BCFA', '#D3E4FD', '#8E9196', '#1EAEDB', '#FF8042', '#FFBB28', '#0088FE', '#00C49F'];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(value);
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 backdrop-blur-sm p-3 border border-border rounded-md shadow-md">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.name?.toString().includes('rate') || entry.name?.toString().includes('Rate') 
                ? formatPercent(entry.value as number) 
                : entry.name?.toString().includes('revenue') || entry.name?.toString().toLowerCase().includes('amount') || entry.name?.toString().toLowerCase().includes('cost')
                  ? formatCurrency(entry.value as number)
                  : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Make sure we have data before rendering charts
  const hasData = metrics && !isLoading;
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-60" /></CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-60" /></CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!hasData || !metrics.orderVolumeByDate || metrics.orderVolumeByDate.length === 0) {
    return (
      <Card className="p-8 text-center border border-muted/20 bg-card/90 backdrop-blur-sm">
        <h3 className="text-lg font-medium mb-2">No chart data available</h3>
        <p className="text-muted-foreground">Upload shipping data to generate charts and insights</p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Volume and Revenue Trend */}
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Order Volume & Revenue Trend</CardTitle>
            <CardDescription>Daily orders and revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={metrics.orderVolumeByDate}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="date" 
                  stroke={textColor} 
                  tick={{ fill: textColor }}
                  tickFormatter={(value) => value.split('-').slice(1).join('-')}
                />
                <YAxis 
                  yAxisId="left" 
                  stroke={textColor} 
                  tick={{ fill: textColor }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke={textColor} 
                  tick={{ fill: textColor }}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="orders" 
                  name="Orders"
                  stroke="#9b87f5" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue"
                  stroke="#D6BCFA" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Order Status Distribution */}
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Breakdown of orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {metrics.statusDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Courier Performance */}
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Courier Performance</CardTitle>
            <CardDescription>Delivery success rate and RTO rate by courier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={metrics.courierPerformance}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  type="number"
                  stroke={textColor}
                  tick={{ fill: textColor }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke={textColor}
                  tick={{ fill: textColor }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="deliveryRate" name="Delivery Rate" fill="#9b87f5" />
                <Bar dataKey="rtoRate" name="RTO Rate" fill="#f59b87" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Geographic Distribution */}
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Order distribution by state</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={metrics.geographicDistribution}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} tick={{ fill: textColor }} />
                <YAxis stroke={textColor} tick={{ fill: textColor }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Orders" fill="#D3E4FD" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Products */}
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best-selling products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={metrics.topProducts}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                type="number"
                stroke={textColor}
                tick={{ fill: textColor }}
                tickFormatter={(value) => `₹${value/1000}k`}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke={textColor}
                tick={{ fill: textColor }}
                width={150}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#7E69AB" />
              <Bar dataKey="quantity" name="Quantity" fill="#1EAEDB" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Payment Method and COD Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Payment Method Distribution</CardTitle>
            <CardDescription>Orders by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.paymentDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {metrics.paymentDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>COD Analysis</CardTitle>
            <CardDescription>Cash on Delivery metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.codAnalysis && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">COD Orders</p>
                  <p className="text-xl font-bold">{metrics.codAnalysis.codOrdersCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">COD Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(metrics.codAnalysis.totalCodAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.codAnalysis.codCollectionRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg COD Charges</p>
                  <p className="text-xl font-bold">{formatCurrency(metrics.codAnalysis.avgCodCharges)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
