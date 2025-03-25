
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, MousePointerClick, TrendingUp, Percent, Target, BarChart4 } from "lucide-react";

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
    // First row metrics
    amountSpent: number;
    purchasesValue: number;
    roas: number;
    linkClicks: number;
    // Second row metrics
    cpc: number;
    ctr: number;
    cpm: number;
    addsToCart: number;
    // Orders data
    results: number;
  };
  isLoading?: boolean;
}

const AnalyticsSummary = ({ data, isLoading = false }: AnalyticsSummaryProps) => {
  const placeholderData = {
    // First row metrics
    amountSpent: data?.amountSpent || 0,
    purchasesValue: data?.purchasesValue || 0,
    roas: data?.roas || 0,
    linkClicks: data?.linkClicks || 0,
    // Second row metrics
    cpc: data?.cpc || 0,
    ctr: data?.ctr || 0,
    cpm: data?.cpm || 0,
    addsToCart: data?.addsToCart || 0,
    // Orders data
    results: data?.results || 0
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

  // Format currency values
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-4">
      {/* First Row - Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Spends"
          value={formatCurrency(placeholderData.amountSpent)}
          description="Total ad spend"
          icon={<DollarSign className="h-4 w-4" />}
          trend="up"
          percentage="8% from last period"
        />
        <StatCard
          title="Sales"
          value={formatCurrency(placeholderData.purchasesValue)}
          description="Total revenue from ads"
          icon={<ShoppingCart className="h-4 w-4" />}
          trend="up"
          percentage="12% from last period"
        />
        <StatCard
          title="ROAS"
          value={`${placeholderData.roas.toFixed(2)}x`}
          description="Return on ad spend"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={placeholderData.roas > 1 ? "up" : "down"}
          percentage={`${((placeholderData.roas - 1) * 100).toFixed(1)}% ROI`}
        />
        <StatCard
          title="Clicks"
          value={placeholderData.linkClicks.toLocaleString()}
          description="Total ad-driven clicks"
          icon={<MousePointerClick className="h-4 w-4" />}
          trend="down"
          percentage="3% from last period"
        />
      </div>

      {/* Second Row - Performance Efficiency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPC"
          value={formatCurrency(placeholderData.cpc)}
          description="Average cost per click"
          icon={<DollarSign className="h-4 w-4" />}
          trend="down"
          percentage="5% from last period"
        />
        <StatCard
          title="CTR"
          value={formatPercentage(placeholderData.ctr)}
          description="Click-through rate"
          icon={<Percent className="h-4 w-4" />}
          trend="up"
          percentage="2% from last period"
        />
        <StatCard
          title="CPM"
          value={formatCurrency(placeholderData.cpm)}
          description="Cost per 1,000 impressions"
          icon={<BarChart4 className="h-4 w-4" />}
          trend="down"
          percentage="4% from last period"
        />
        <StatCard
          title="Add to Carts"
          value={placeholderData.addsToCart.toLocaleString()}
          description="Total add to cart actions driven by ads"
          icon={<Target className="h-4 w-4" />}
          trend="up"
          percentage="10% from last period"
        />
      </div>
    </div>
  );
};

export default AnalyticsSummary;
