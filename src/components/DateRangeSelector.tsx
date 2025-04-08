
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

export interface DateRangeProps {
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  startDate?: Date;
  endDate?: Date;
}

const DateRangeSelector = ({ onDateRangeChange, startDate, endDate }: DateRangeProps) => {
  const [selectedRange, setSelectedRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startDate,
    to: endDate
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Update internal state when props change
  useEffect(() => {
    if (startDate !== selectedRange.from || endDate !== selectedRange.to) {
      setSelectedRange({
        from: startDate,
        to: endDate
      });
    }
  }, [startDate, endDate]);
  
  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return format(date, "MMM dd, yyyy");
  };
  
  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setSelectedRange(range);
    
    // Only call the parent's callback if both dates are selected
    if (range.from && range.to) {
      console.log("DateRangeSelector: Range selected", { from: range.from, to: range.to });
      onDateRangeChange(range.from, range.to);
      setIsCalendarOpen(false);
    }
  };
  
  return (
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-white/20 hover:bg-white/5 text-white h-9 w-auto"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedRange.from && selectedRange.to
            ? `${formatDate(selectedRange.from)} - ${formatDate(selectedRange.to)}`
            : "Select Date Range"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleRangeSelect}
          numberOfMonths={2}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;
