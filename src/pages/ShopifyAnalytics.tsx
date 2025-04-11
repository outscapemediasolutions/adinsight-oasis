
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import ShopifyCSVUpload from "@/components/ShopifyCSVUpload";
import ShopifyDashboard from "@/components/ShopifyDashboard";
import ShopifyUploadHistory from "@/components/ShopifyUploadHistory";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DateRangeSelector from "@/components/DateRangeSelector";
import { useLocation } from "react-router-dom";

const ShopifyAnalytics = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);
  const [dateRange, setDateRange] = useState<{ start?: Date, end?: Date }>({});
  
  useEffect(() => {
    // Check for tab to show from navigation state
    if (location.state && location.state.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.state]);
  
  const handleTemplateDownload = () => {
    const headers = [
      "Name", "Email", "Financial Status", "Paid at", "Fulfillment Status",
      "Fulfilled at", "Accepts Marketing", "Currency", "Subtotal", "Shipping",
      "Taxes", "Total", "Discount Code", "Discount Amount", "Shipping Method",
      "Created at", "Lineitem quantity", "Lineitem name", "Lineitem price",
      "Lineitem compare at price", "Lineitem sku", "Lineitem requires shipping",
      "Lineitem taxable", "Lineitem fulfillment status", "Billing Name",
      "Billing Street", "Billing Address1", "Billing Address2", "Billing Company",
      "Billing City", "Billing Zip", "Billing Province", "Billing Country",
      "Billing Phone", "Shipping Name", "Shipping Street", "Shipping Address1",
      "Shipping Address2", "Shipping Company", "Shipping City", "Shipping Zip",
      "Shipping Province", "Shipping Country", "Shipping Phone", "Notes",
      "Note Attributes", "Cancelled at", "Payment Method", "Payment Reference",
      "Refunded Amount", "Vendor", "Outstanding Balance", "Employee", "Location",
      "Device ID", "Id", "Tags", "Risk Level", "Source", "Lineitem discount",
      "Tax 1 Name", "Tax 1 Value", "Tax 2 Name", "Tax 2 Value", "Tax 3 Name",
      "Tax 3 Value", "Tax 4 Name", "Tax 4 Value", "Tax 5 Name", "Tax 5 Value",
      "Phone", "Receipt Number", "Duties", "Billing Province Name",
      "Shipping Province Name", "Payment ID", "Payment Terms Name",
      "Next Payment Due At", "Payment References"
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
    a.download = "shopify_template.csv";
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    toast.success("Template downloaded successfully");
  };
  
  const handleUploadStart = () => {
    setUploadSuccess(false);
    setUploadFilename(null);
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
        <h2 className="text-3xl font-bold tracking-tight">D2C Scaler - Shopify Analytics</h2>
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
          <ShopifyDashboard dateRange={dateRange} />
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Upload Shopify Data</CardTitle>
              <CardDescription>
                Upload your Shopify sales report in CSV format to analyze your store's performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ShopifyCSVUpload
                onUploadStart={handleUploadStart}
                onUploadComplete={handleUploadComplete}
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
                <DialogTitle>Shopify CSV Template Guide</DialogTitle>
                <DialogDescription>
                  Follow these guidelines to ensure your Shopify CSV file is properly formatted for upload.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>
                  The CSV file should contain the following columns, matching your Shopify export format:
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
                        <TableCell className="font-medium">Name</TableCell>
                        <TableCell>Customer's name</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Email</TableCell>
                        <TableCell>Customer's email address</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Financial Status</TableCell>
                        <TableCell>Payment status (paid, pending, refunded, etc.)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell>Total order amount</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Created at</TableCell>
                        <TableCell>Order creation date</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Lineitem name</TableCell>
                        <TableCell>Product name</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Lineitem quantity</TableCell>
                        <TableCell>Product quantity</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Lineitem price</TableCell>
                        <TableCell>Product price</TableCell>
                      </TableRow>
                      {/* Add a few more key fields */}
                      <TableRow>
                        <TableCell className="font-medium">Subtotal</TableCell>
                        <TableCell>Order subtotal before taxes and shipping</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Shipping</TableCell>
                        <TableCell>Shipping costs</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Taxes</TableCell>
                        <TableCell>Tax amounts</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Discount Amount</TableCell>
                        <TableCell>Discount applied to the order</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  The template includes all standard Shopify export fields. You can download a sample template above.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setShowTemplateDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <ShopifyUploadHistory refreshTrigger={refreshHistoryTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShopifyAnalytics;
