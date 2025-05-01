
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
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Check for tab to show from navigation state
    if (location.state && location.state.defaultTab) {
      console.log("Setting active tab from location state:", location.state.defaultTab);
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
    
    // Add a second row with some values but missing Tracking ID
    const sampleRow2 = headers.map((header) => {
      switch(header) {
        case "Order ID": return "1000";
        case "Ship Date": return "2023-05-01";
        case "Status": return "Delivered";
        case "Product Name": return "Test Product";
        case "Product Quantity": return "1";
        case "Order Total": return "1000";
        default: return "";
      }
    });
    
    // Add a third row with Tracking ID
    const sampleRow3 = headers.map((header) => {
      switch(header) {
        case "Order ID": return "1001";
        case "Tracking ID": return "TRACK123456"; // Has tracking ID
        case "Ship Date": return "2023-05-02";
        case "Status": return "In Transit";
        case "Product Name": return "Sample Product";
        case "Product Quantity": return "2";
        case "Order Total": return "2000";
        default: return "";
      }
    });
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      sampleRow.join(","),
      sampleRow2.join(","),
      sampleRow3.join(",")
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
    console.log("Upload start handler triggered");
    setUploadSuccess(false);
    setUploadFilename(null);
  };
  
  const handleHeadersDetected = (headers: string[]) => {
    console.log("CSV Headers detected:", headers);
    setCsvHeaders(headers);
    
    // Always show the column mapping dialog for better user experience
    setShowColumnMappingDialog(true);
  };
  
  const handleUploadComplete = (success: boolean, filename?: string) => {
    console.log("Upload complete handler triggered:", success, filename);
    setUploadSuccess(success);
    setUploadFilename(filename || null);
    if (success) {
      handleUploadSuccess();
      // Switch to dashboard tab to show the uploaded data
      setTimeout(() => {
        setActiveTab("dashboard");
      }, 2000);
    }
  };

  const handleUploadSuccess = () => {
    console.log("Upload successful, refreshing history...");
    setRefreshHistoryTrigger(prev => prev + 1);
  };
  
  const handleColumnMappingConfirm = (mapping: Record<string, string>) => {
    console.log("Column mapping confirmed:", mapping);
    setColumnMapping(mapping);
    setShowColumnMappingDialog(false);
    toast.success("Column mapping applied. Please proceed with the upload.");
  };
  
  const handleDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    console.log("Date range changed:", startDate, endDate);
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
                {csvHeaders.length > 0 && columnMapping && Object.keys(columnMapping).length > 0 && (
                  <div className="mt-2 text-xs text-green-500">
                    Column mapping is set. You can now upload your data.
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ShippingCSVUpload
                onUploadStart={handleUploadStart}
                onUploadComplete={handleUploadComplete}
                onHeadersDetected={handleHeadersDetected}
                columnMapping={columnMapping}
              />
              
              {csvHeaders.length > 0 && (
                <div className="mt-2 text-sm flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowColumnMappingDialog(true)}
                    className="text-xs"
                  >
                    {Object.keys(columnMapping).length > 0 ? "Modify Column Mapping" : "Set Column Mapping"}
                  </Button>
                </div>
              )}
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
                  The CSV file should contain the following columns. Don't worry if your column names are different - 
                  you'll be able to map them during upload.
                </p>
                <div className="rounded-md border overflow-auto max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Field Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Order ID</TableCell>
                        <TableCell>Unique identifier for the order</TableCell>
                        <TableCell>Yes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Tracking ID</TableCell>
                        <TableCell>Tracking number for the shipment (Primary field - only orders with this will display in dashboard)</TableCell>
                        <TableCell>Yes *</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ship Date</TableCell>
                        <TableCell>Date when the order was shipped</TableCell>
                        <TableCell>Yes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Status</TableCell>
                        <TableCell>Current status of the order (DELIVERED, RTO, etc.)</TableCell>
                        <TableCell>Yes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Product Name</TableCell>
                        <TableCell>Name of the product</TableCell>
                        <TableCell>Yes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Product Quantity</TableCell>
                        <TableCell>Quantity of products ordered</TableCell>
                        <TableCell>Yes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Order Total</TableCell>
                        <TableCell>Total amount of the order</TableCell>
                        <TableCell>Yes</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Payment Method</TableCell>
                        <TableCell>Method of payment (COD, Prepaid)</TableCell>
                        <TableCell>No</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Courier Company</TableCell>
                        <TableCell>Name of the courier service used</TableCell>
                        <TableCell>No</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Weight (KG)</TableCell>
                        <TableCell>Actual weight of the package</TableCell>
                        <TableCell>No</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Charged Weight</TableCell>
                        <TableCell>Weight used for calculating shipping charges</TableCell>
                        <TableCell>No</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">COD Payble Amount</TableCell>
                        <TableCell>Amount to be collected for COD orders</TableCell>
                        <TableCell>No</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  * Tracking ID is required for orders to appear in the dashboard, but the system will still upload records without it.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Empty cells in your CSV will be treated as follows:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>Empty text fields: Will show as blank in the system</li>
                  <li>Empty numerical fields: Will be saved as 0</li>
                  <li>Rows without Tracking ID: Will be uploaded but not shown in dashboard</li>
                </ul>
                <p className="text-sm text-yellow-500 mt-2">
                  If your CSV has different column names, don't worry! You'll be able to map them after selecting your file.
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
            onConfirm={handleColumnMappingConfirm}
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
