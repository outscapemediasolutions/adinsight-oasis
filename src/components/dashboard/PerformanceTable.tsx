
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Format value based on type
  const formatValue = (value: number, type: 'ctr' | 'cpm' | 'money' | 'number') => {
    switch (type) {
      case 'ctr':
        return `${(value * 100).toFixed(2)}%`;
      case 'cpm':
        return `₹${value.toFixed(2)}`;
      case 'money':
        return `₹${value.toLocaleString()}`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto -mx-1">
        <Table className="w-full">
          <TableCaption className="mt-1 text-xs">Recent campaign performance data</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 text-xs">Date</TableHead>
              <TableHead className="py-1.5 text-xs">Campaign</TableHead>
              <TableHead className="py-1.5 text-xs">Ad Set</TableHead>
              <TableHead className="py-1.5 text-xs text-right">Impressions</TableHead>
              <TableHead className="py-1.5 text-xs text-right">Clicks</TableHead>
              <TableHead className="py-1.5 text-xs text-right">CTR</TableHead>
              <TableHead className="py-1.5 text-xs text-right">CPM</TableHead>
              <TableHead className="py-1.5 text-xs text-right">Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 7).map((row, index) => (
              <TableRow key={index} className="group hover:bg-white/5">
                <TableCell className="py-1 text-xs">{row.date}</TableCell>
                <TableCell className="py-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="max-w-[120px] truncate cursor-help">
                        {formatChartLabel(row.campaignName)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p>{row.campaignName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="py-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="max-w-[120px] truncate cursor-help">
                        {formatChartLabel(row.adSetName)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p>{row.adSetName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="py-1 text-xs text-right">{formatValue(row.impressions, 'number')}</TableCell>
                <TableCell className="py-1 text-xs text-right">{formatValue(row.linkClicks, 'number')}</TableCell>
                <TableCell className="py-1 text-xs text-right">{formatValue(row.ctr, 'ctr')}</TableCell>
                <TableCell className="py-1 text-xs text-right">{formatValue(row.cpm, 'cpm')}</TableCell>
                <TableCell className="py-1 text-xs text-right">{formatValue(row.amountSpent, 'money')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default PerformanceTable;
