
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, isEqual, parseISO } from "date-fns";
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
  const [activePreset, setActivePreset] = useState("Last 7 Days");

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

  // Format date for Firebase query (YYYY-MM-DD)
  const formatDateForQuery = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle preset change
  const handlePresetChange = (preset: PresetRange) => {
    const newRange = preset.value();
    setDate(newRange);
    setActivePreset(preset.name);
    
    if (newRange.from && newRange.to) {
      // Ensure dates are passed in the correct format
      onDateRangeChange(newRange.from, newRange.to);
      
      console.log(`DateRangeSelector: Selected preset ${preset.name} - ${formatDateForQuery(newRange.from)} to ${formatDateForQuery(newRange.to)}`);
    }
    
    setIsCalendarOpen(false);
  };

  // Handle date change from calendar
  const handleDateChange = (newDate: DateRange | undefined) => {
    if (!newDate) return;
    
    setDate(newDate);
    
    // Only trigger the callback when both dates are selected
    if (newDate.from && newDate.to) {
      // Ensure dates are passed in the correct format
      onDateRangeChange(newDate.from, newDate.to);
      
      console.log(`DateRangeSelector: Selected date range ${formatDateForQuery(newDate.from)} to ${formatDateForQuery(newDate.to)}`);
      
      // Check if the selected range matches any preset
      const matchingPreset = presets.find(preset => {
        const presetRange = preset.value();
        return (
          presetRange.from && 
          presetRange.to && 
          newDate.from &&
          newDate.to &&
          isEqual(presetRange.from, newDate.from) && 
          isEqual(presetRange.to, newDate.to)
        );
      });
      
      setActivePreset(matchingPreset ? matchingPreset.name : "Custom");
    }
  };

  // Set initial date range to Last 7 Days
  useEffect(() => {
    const last7Days = presets.find(p => p.name === "Last 7 Days");
    if (last7Days) {
      const range = last7Days.value();
      setDate(range);
      if (range.from && range.to) {
        // Make sure to trigger the callback with the initial date range
        onDateRangeChange(range.from, range.to);
        console.log(`DateRangeSelector: Initial range set to ${formatDateForQuery(range.from)} to ${formatDateForQuery(range.to)}`);
      }
    }
  }, []);

  return (
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 pl-3 pr-3 justify-between font-normal transition-all rounded-md border-white/20 hover:bg-white/5",
            activePreset === "Custom" && "border-adpulse-green text-adpulse-green bg-adpulse-green/10",
            "font-poppins"
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
            "Select date range"
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-white/10 bg-[#0B2537]" align="end">
        <div className="p-3 border-b border-white/10">
          <div className="flex flex-wrap gap-1 mb-2">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant={activePreset === preset.name ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange(preset)}
                className={cn(
                  "h-8 text-xs rounded transition-all font-medium font-poppins",
                  activePreset === preset.name 
                    ? "bg-adpulse-green text-adpulse-blue-dark hover:bg-adpulse-green/90" 
                    : "text-foreground/70 hover:text-foreground border-white/20 hover:bg-white/5"
                )}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date.from}
          selected={date}
          onSelect={(newDate) => handleDateChange(newDate as DateRange)}
          numberOfMonths={2}
          disabled={(date) => date > new Date()}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeSelector;
