
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangeProps {
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type PresetRange = {
  name: string;
  value: () => DateRange;
};

const DateRangeSelector = ({ onDateRangeChange }: DateRangeProps) => {
  const [date, setDate] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activePreset, setActivePreset] = useState("Today");

  // Preset date ranges
  const presets: PresetRange[] = [
    {
      name: "Today",
      value: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    {
      name: "Yesterday",
      value: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: yesterday };
      },
    },
    {
      name: "Last 7 Days",
      value: () => {
        const today = new Date();
        const last7Days = new Date();
        last7Days.setDate(today.getDate() - 6);
        return { from: last7Days, to: today };
      },
    },
    {
      name: "Last 30 Days",
      value: () => {
        const today = new Date();
        const last30Days = new Date();
        last30Days.setDate(today.getDate() - 29);
        return { from: last30Days, to: today };
      },
    },
    {
      name: "This Month",
      value: () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: firstDayOfMonth, to: today };
      },
    },
    {
      name: "Last Month",
      value: () => {
        const today = new Date();
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: firstDayOfLastMonth, to: lastDayOfLastMonth };
      },
    },
  ];

  // Handle preset change
  const handlePresetChange = (preset: PresetRange) => {
    const newRange = preset.value();
    setDate(newRange);
    setActivePreset(preset.name);
    onDateRangeChange(newRange.from, newRange.to);
    setIsCalendarOpen(false);
  };

  // Handle date change from calendar
  const handleDateChange = (newDate: DateRange) => {
    setDate(newDate);
    if (newDate.from && newDate.to) {
      onDateRangeChange(newDate.from, newDate.to);
      setActivePreset("Custom");
    }
  };

  // Set initial date range to Last 7 Days
  useEffect(() => {
    const last7Days = presets.find(p => p.name === "Last 7 Days");
    if (last7Days) {
      handlePresetChange(last7Days);
    }
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
      <div className="text-sm font-medium">Date Range:</div>
      
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.name}
            variant={activePreset === preset.name ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange(preset)}
            className={cn(
              "h-9 rounded-full transition-all",
              activePreset === preset.name 
                ? "bg-adpulse-green text-adpulse-blue-dark hover:bg-adpulse-green/90" 
                : "text-foreground/70 hover:text-foreground hover:bg-muted"
            )}
          >
            {preset.name}
          </Button>
        ))}
      </div>
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 pl-3 pr-3 justify-between font-normal transition-all rounded-full",
              activePreset === "Custom" && "border-adpulse-green text-adpulse-green bg-adpulse-green/10"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM d, yyyy")} - {format(date.to, "MMM d, yyyy")}
                </>
              ) : (
                format(date.from, "MMM d, yyyy")
              )
            ) : (
              "Pick a date"
            )}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date.from}
            selected={date}
            onSelect={(newDate) => handleDateChange(newDate as DateRange)}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeSelector;
