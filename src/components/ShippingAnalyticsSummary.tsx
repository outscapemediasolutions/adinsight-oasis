
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, TrendingDown, CreditCard, Truck, Users } from "lucide-react";
import { ShippingMetrics } from "./utils/calculateMetrics";

interface ShippingAnalyticsSummaryProps {
  metrics: ShippingMetrics | null;
  isLoading: boolean;
}

export const ShippingAnalyticsSummary = ({ metrics, isLoading }: ShippingAnalyticsSummaryProps) => {
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(value);
  };
  
  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('en-IN').format(value);
  };
  
  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0%';
    return new Intl.NumberFormat('en-IN', { 
      style: 'percent', 
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-bold">
              {metrics ? formatNumber(metrics.totalOrders) : '0'}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <div className="text-2xl font-bold">
              {metrics ? formatCurrency(metrics.totalRevenue) : formatCurrency(0)}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-bold">
              {metrics ? formatCurrency(metrics.avgOrderValue) : formatCurrency(0)}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Discount Rate</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-bold">
              {metrics ? formatPercent(metrics.discountPercentage) : '0%'}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Delivery Success Rate</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-bold">
              {metrics && metrics.courierPerformance && metrics.courierPerformance.length > 0
                ? formatPercent(metrics.courierPerformance.reduce((sum: number, courier: any) => 
                    sum + ((courier.deliveryRate || 0) * (courier.total || 0)), 0) / 
                    metrics.courierPerformance.reduce((sum: number, courier: any) => sum + (courier.total || 0), 0))
                : '0%'
              }
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="border border-muted/20 bg-card/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-bold">
              {metrics && metrics.customerAnalysis 
                ? formatNumber(metrics.customerAnalysis.uniqueCustomers) 
                : '0'
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
