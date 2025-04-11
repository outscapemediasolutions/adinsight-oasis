
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, ShoppingBag, ShoppingCart, TrendingUp, CreditCard, IndianRupee } from "lucide-react";

interface ShopifyAnalyticsSummaryProps {
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    uniqueCustomers: number;
    productsSold: number;
  } | null;
  isLoading: boolean;
}

export const ShopifyAnalyticsSummary = ({ metrics, isLoading }: ShopifyAnalyticsSummaryProps) => {
  const summaryCards = [
    {
      title: "Total Revenue",
      value: metrics ? `₹${metrics.totalRevenue.toFixed(2)}` : "₹0.00",
      icon: IndianRupee,
      description: "Revenue from all orders",
      colorClass: "text-green-500 bg-green-500/10",
    },
    {
      title: "Total Orders",
      value: metrics ? metrics.totalOrders.toString() : "0",
      icon: ShoppingCart,
      description: "Total number of orders",
      colorClass: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Average Order Value",
      value: metrics ? `₹${metrics.avgOrderValue.toFixed(2)}` : "₹0.00",
      icon: CreditCard,
      description: "Average value per order",
      colorClass: "text-purple-500 bg-purple-500/10",
    },
    {
      title: "Unique Customers",
      value: metrics ? metrics.uniqueCustomers.toString() : "0",
      icon: Users,
      description: "Total unique customers",
      colorClass: "text-orange-500 bg-orange-500/10",
    },
    {
      title: "Products Sold",
      value: metrics ? metrics.productsSold.toString() : "0",
      icon: ShoppingBag,
      description: "Total quantity of items sold",
      colorClass: "text-adpulse-green bg-adpulse-green/10",
    },
    {
      title: "Conversion Rate",
      value: "2.4%",
      icon: TrendingUp,
      description: "Store conversion rate",
      colorClass: "text-yellow-500 bg-yellow-500/10",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {summaryCards.map((card, index) => (
        <Card key={index} className="border border-muted/20 bg-card/90 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-md ${card.colorClass}`}>
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
