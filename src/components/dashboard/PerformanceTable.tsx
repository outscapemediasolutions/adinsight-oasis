
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
import { formatChartLabel } from "@/components/ui/chart";

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
      <div className="w-full rounded-md border p-4 text-center">
        <p className="text-muted-foreground">No data available to display</p>
      </div>
    );
  }

  return (
    <Table className="w-full">
      <TableCaption className="mt-1 text-xs">Recent campaign performance data</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="py-2">Date</TableHead>
          <TableHead className="py-2">Campaign</TableHead>
          <TableHead className="py-2">Ad Set</TableHead>
          <TableHead className="py-2">Impressions</TableHead>
          <TableHead className="py-2">Clicks</TableHead>
          <TableHead className="py-2">CTR</TableHead>
          <TableHead className="py-2">CPM</TableHead>
          <TableHead className="py-2 text-right">Amount Spent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.slice(0, 7).map((row, index) => (
          <TableRow key={index}>
            <TableCell className="py-1">{row.date}</TableCell>
            <TableCell className="py-1">
              <div className="max-w-[120px] text-sm truncate" title={row.campaignName}>
                {formatChartLabel(row.campaignName)}
              </div>
            </TableCell>
            <TableCell className="py-1">
              <div className="max-w-[120px] text-sm truncate" title={row.adSetName}>
                {formatChartLabel(row.adSetName)}
              </div>
            </TableCell>
            <TableCell className="py-1">{row.impressions.toLocaleString()}</TableCell>
            <TableCell className="py-1">{row.linkClicks.toLocaleString()}</TableCell>
            <TableCell className="py-1">{(row.ctr * 100).toFixed(2)}%</TableCell>
            <TableCell className="py-1">₹{row.cpm.toFixed(2)}</TableCell>
            <TableCell className="py-1 text-right">₹{row.amountSpent.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default PerformanceTable;
