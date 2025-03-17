
import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdData } from "@/services/data";

interface PerformanceTableProps {
  data: AdData[];
  isLoading?: boolean;
}

const PerformanceTable = ({ data, isLoading = false }: PerformanceTableProps) => {
  if (isLoading) {
    return (
      <div className="w-full rounded-md border animate-pulse">
        <div className="h-10 bg-muted rounded-t-md"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-card border-t"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No data available to display</p>
      </div>
    );
  }

  return (
    <Table>
      <TableCaption>Recent campaign performance data</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Campaign</TableHead>
          <TableHead>Ad Set</TableHead>
          <TableHead>Impressions</TableHead>
          <TableHead>Clicks</TableHead>
          <TableHead>CTR</TableHead>
          <TableHead className="text-right">Amount Spent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.slice(0, 7).map((row, index) => (
          <TableRow key={index}>
            <TableCell>{row.date}</TableCell>
            <TableCell>{row.campaignName}</TableCell>
            <TableCell>{row.adSetName}</TableCell>
            <TableCell>{row.impressions.toLocaleString()}</TableCell>
            <TableCell>{row.clicksAll.toLocaleString()}</TableCell>
            <TableCell>{(row.ctr * 100).toFixed(2)}%</TableCell>
            <TableCell className="text-right">₹{row.amountSpent.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default PerformanceTable;
