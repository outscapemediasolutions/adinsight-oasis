
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { ArrowUpDown } from "lucide-react";

interface CampaignData {
  name: string;
  spend: number;
  sales: number;
  roas: number;
}

interface CampaignPerformanceChartProps {
  data?: CampaignData[];
  isLoading?: boolean;
}

const CampaignPerformanceChart = ({ data, isLoading = false }: CampaignPerformanceChartProps) => {
  const placeholderData: CampaignData[] = data || [
    { name: "Summer Sale", spend: 12000, sales: 36000, roas: 3.0 },
    { name: "New Collection", spend: 8500, sales: 21250, roas: 2.5 },
    { name: "Holiday Special", spend: 15000, sales: 37500, roas: 2.5 },
    { name: "Flash Sale", spend: 5000, sales: 18000, roas: 3.6 },
    { name: "Clearance", spend: 6500, sales: 9750, roas: 1.5 }
  ];

  const sortedByRoas = [...placeholderData].sort((a, b) => b.roas - a.roas);
  const sortedBySpend = [...placeholderData].sort((a, b) => b.spend - a.spend);
  const sortedBySales = [...placeholderData].sort((a, b) => b.sales - a.sales);

  const colors = ["#6fe394", "#00bcd4", "#ffcc00", "#ff9800", "#ff5252"];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
          </CardTitle>
          <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/30 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    spend: {
      label: "Ad Spend",
      theme: {
        light: "#00bcd4",
        dark: "#00bcd4"
      }
    },
    sales: {
      label: "Sales Revenue",
      theme: {
        light: "#6fe394",
        dark: "#6fe394"
      }
    },
    roas: {
      label: "ROAS",
      theme: {
        light: "#ffcc00",
        dark: "#ffcc00"
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Campaign Performance <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="roas">
          <TabsList className="mb-4">
            <TabsTrigger value="roas">ROAS</TabsTrigger>
            <TabsTrigger value="spend">Spend</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>
          <TabsContent value="roas" className="h-[300px]">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedByRoas} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `${value}x`} 
                    domain={[0, Math.max(...sortedByRoas.map(item => item.roas)) * 1.2]} 
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="roas" name="ROAS">
                    {sortedByRoas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="spend" className="h-[300px]">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedBySpend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `₹${value / 1000}k`} 
                    domain={[0, Math.max(...sortedBySpend.map(item => item.spend)) * 1.2]} 
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="spend" name="Ad Spend">
                    {sortedBySpend.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="sales" className="h-[300px]">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedBySales} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `₹${value / 1000}k`} 
                    domain={[0, Math.max(...sortedBySales.map(item => item.sales)) * 1.2]} 
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="sales" name="Sales Revenue">
                    {sortedBySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CampaignPerformanceChart;
