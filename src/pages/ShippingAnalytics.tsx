
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DateRangeSelector from "@/components/DateRangeSelector";
import ShippingCSVUpload from "@/components/ShippingCSVUpload";
import ShippingDashboard from "@/components/ShippingDashboard";
import ShippingUploadHistory from "@/components/ShippingUploadHistory";
import ColumnMappingDialog from "@/components/ColumnMappingDialog";

const ShippingAnalytics = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showColumnMappingDialog, setShowColumnMappingDialog] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);
  const [dateRange, setDateRange] = useState<{ start?: Date, end?: Date }>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  
  useEffect(() => {
    // Check for tab to show from navigation state
    if (location.state && location.state.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.state]);
  
  const handleTemplateDownload = () => {
    const headers = [
      "Order ID", "Tracking ID", "Ship Date", "Channel", "Status",
      "Channel SKU", "Master SKU", "Product Name", "Product Category", 
      "Product Quantity", "Customer Name", "Customer Email", "Customer Mobile",
      "Address Line 1", "Address Line 2", "Address City", "Address State", 
      "Address Pincode", "Payment Method", "Product Price", "Order Total",
      "Discount Value", "Weight (KG)", "Charged Weight", "Courier Company",
      "Pickup Location ID", "COD Payble Amount", "Remitted Amount", "COD Charges",
      "Shipping Charges", "Freight Total Amount", "Pickup Pincode"
    ];
    
    // Create a sample row with empty values
    const sampleRow = headers.map(() => "");
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      sampleRow.join(",")
    ].join("\n");
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download the CSV
    const a = document.createElement("a");
    a.href = url;
    a.download = "shipping_template.csv";
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    toast.success("Template downloaded successfully");
  };
  
  const handleUploadStart = () => {
    setUploadSuccess(false);
    setUploadFilename(null);
  };
  
  const handleHeadersDetected = (headers: string[]) => {
    setCsvHeaders(headers);
    
    // Check if all required headers are present
    const requiredHeaders = [
      "Order ID", "Ship Date", "Status", "Product Name", 
      "Product Quantity", "Order Total"
    ];
    
    const missingHeaders = requiredHeaders.filter(
      header => !headers.some(h => h.toLowerCase() === header.toLowerCase())
    );
    
    if (missingHeaders.length > 0) {
      setShowColumnMappingDialog(true);
    }
  };
  
  const handleUploadComplete = (success: boolean, filename?: string) => {
    setUploadSuccess(success);
    setUploadFilename(filename || null);
    if (success) {
      handleUploadSuccess();
    }
  };

  const handleUploadSuccess = () => {
    console.log("Upload successful, refreshing history...");
    setRefreshHistoryTrigger(prev => prev + 1);
  };
  
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setDateRange({ start: startDate, end: endDate });
  };
  
  return (
    <div className="container relative py-10 font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">D2C Scaler - Shipping Analytics</h2>
        <DateRangeSelector 
          onDateRangeChange={handleDateRangeChange}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#021627]/50">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="upload">Data Upload</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <ShippingDashboard dateRange={dateRange} />
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Upload Shipping Data</CardTitle>
              <CardDescription>
                Upload your shipping data in CSV format to analyze your logistics performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ShippingCSVUpload
                onUploadStart={handleUploadStart}
                onUploadComplete={handleUploadComplete}
                onHeadersDetected={handleHeadersDetected}
              />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button variant="link" onClick={() => setShowTemplateDialog(true)}>
                <HelpCircle className="mr-2 h-4 w-4" />
                View Template Guide
              </Button>
              <Button variant="secondary" onClick={handleTemplateDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
            </CardFooter>
          </Card>
          
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Shipping Data CSV Template Guide</DialogTitle>
                <DialogDescription>
                  Follow these guidelines to ensure your shipping CSV file is properly formatted for upload.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>
                  The CSV file should contain the following columns:
                </p>
                <div className="rounded-md border overflow-auto max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Column Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Order ID</TableCell>
                        <TableCell>Unique identifier for the order</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Tracking ID</TableCell>
                        <TableCell>Tracking number for the shipment</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ship Date</TableCell>
                        <TableCell>Date when the order was shipped</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Status</TableCell>
                        <TableCell>Current status of the order (DELIVERED, RTO, etc.)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Product Name</TableCell>
                        <TableCell>Name of the product</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Product Quantity</TableCell>
                        <TableCell>Quantity of products ordered</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Order Total</TableCell>
                        <TableCell>Total amount of the order</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Courier Company</TableCell>
                        <TableCell>Name of the courier service used</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Weight (KG)</TableCell>
                        <TableCell>Actual weight of the package</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Charged Weight</TableCell>
                        <TableCell>Weight used for calculating shipping charges</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">COD Payble Amount</TableCell>
                        <TableCell>Amount to be collected for COD orders</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Payment Method</TableCell>
                        <TableCell>Method of payment (COD, Prepaid)</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can download a sample template above to ensure your data is formatted correctly.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setShowTemplateDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <ColumnMappingDialog 
            open={showColumnMappingDialog} 
            onOpenChange={setShowColumnMappingDialog} 
            csvHeaders={csvHeaders} 
          />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <ShippingUploadHistory refreshTrigger={refreshHistoryTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShippingAnalytics;
