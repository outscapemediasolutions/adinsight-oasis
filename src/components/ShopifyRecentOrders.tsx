
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ShopifyOrder } from "./ShopifyDashboard";

interface ShopifyRecentOrdersProps {
  orders: ShopifyOrder[];
  isLoading: boolean;
}

export const ShopifyRecentOrders = ({ orders, isLoading }: ShopifyRecentOrdersProps) => {
  // Take only the first 10 orders
  const recentOrders = orders.slice(0, 10);
  
  const getStatusColor = (status: string) => {
    status = status.toLowerCase();
    if (status === "paid" || status === "fulfilled") return "bg-green-500/10 text-green-500";
    if (status === "pending" || status === "partial") return "bg-yellow-500/10 text-yellow-500";
    if (status === "refunded" || status === "cancelled") return "bg-red-500/10 text-red-500";
    return "bg-blue-500/10 text-blue-500";
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            {Array(5).fill(null).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order, index) => (
                  <TableRow key={order.id || index}>
                    <TableCell>
                      {format(order.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.financialStatus)} variant="secondary">
                        {order.financialStatus || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.lineItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
