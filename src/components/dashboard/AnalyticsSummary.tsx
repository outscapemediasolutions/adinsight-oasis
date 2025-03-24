
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  percentage?: string;
}

const StatCard = ({ title, value, description, icon, trend, percentage }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium font-poppins">{title}</CardTitle>
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold font-poppins">{value}</div>
      <p className="text-xs text-muted-foreground font-poppins">{description}</p>
      {trend && percentage && (
        <div className="flex items-center pt-1">
          {trend === "up" ? (
            <ArrowUpIcon className="h-3 w-3 text-adpulse-green mr-1" />
          ) : trend === "down" ? (
            <ArrowDownIcon className="h-3 w-3 text-adpulse-red mr-1" />
          ) : null}
          <span className={`text-xs font-poppins ${trend === "up" ? "text-adpulse-green" : trend === "down" ? "text-adpulse-red" : ""}`}>
            {percentage}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

interface AnalyticsSummaryProps {
  data?: {
    totalSales: number;
    totalOrders: number;
    totalVisitors: number;
    roas: number;
  };
  isLoading?: boolean;
}

const AnalyticsSummary = ({ data, isLoading = false }: AnalyticsSummaryProps) => {
  const placeholderData = {
    totalSales: data?.totalSales || 0,
    totalOrders: data?.totalOrders || 0,
    totalVisitors: data?.totalVisitors || 0,
    roas: data?.roas || 0
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-[140px]">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 w-16 bg-muted rounded mb-2"></div>
              <div className="h-3 w-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Revenue"
        value={`₹${placeholderData.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
        description="Purchase conversion value from ads"
        icon={<DollarSign className="h-4 w-4" />}
        trend="up"
        percentage="12% from last period"
      />
      <StatCard
        title="Orders"
        value={placeholderData.totalOrders.toLocaleString()}
        description="Total sales attributed to ads"
        icon={<ShoppingCart className="h-4 w-4" />}
        trend="up"
        percentage="7% from last period"
      />
      <StatCard
        title="Link Clicks"
        value={placeholderData.totalVisitors.toLocaleString()}
        description="Total clicks from all campaigns"
        icon={<Users className="h-4 w-4" />}
        trend="down"
        percentage="3% from last period"
      />
      <StatCard
        title="ROAS"
        value={placeholderData.roas.toFixed(2) + "x"}
        description="Return on ad spend"
        icon={<TrendingUp className="h-4 w-4" />}
        trend={placeholderData.roas > 1 ? "up" : "down"}
        percentage={`${((placeholderData.roas - 1) * 100).toFixed(1)}% ROI`}
      />
    </div>
  );
};

export default AnalyticsSummary;
