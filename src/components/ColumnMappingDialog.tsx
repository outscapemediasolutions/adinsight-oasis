
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvHeaders: string[];
  onConfirm?: (mapping: Record<string, string>) => void;
}

// Define field descriptions for help tooltips
const fieldDescriptions: Record<string, string> = {
  orderId: "Unique identifier for the order",
  trackingId: "Tracking number assigned by the courier (primary field for dashboard)",
  shipDate: "Date when the order was shipped",
  status: "Current status of the shipment (Delivered, RTO, etc.)",
  productName: "Name of the product",
  productCategory: "Category the product belongs to",
  productQuantity: "Number of units ordered",
  orderTotal: "Total amount of the order",
  courierCompany: "Name of the courier service",
  paymentMethod: "Method used for payment (COD, Prepaid)",
  weight: "Actual weight of the package in KG",
  chargedWeight: "Weight used for billing",
  codPayableAmount: "Amount to be collected for COD orders",
  customerName: "Name of the customer",
  customerEmail: "Email address of the customer",
  addressCity: "City of delivery address",
  addressState: "State of delivery address"
};

// Function to determine field importance
const getFieldImportance = (fieldKey: string): 'required' | 'recommended' | 'optional' => {
  const required = ['orderId', 'shipDate', 'trackingId'];
  const recommended = ['status', 'productName', 'productQuantity', 'orderTotal', 'paymentMethod'];
  
  if (required.includes(fieldKey)) return 'required';
  if (recommended.includes(fieldKey)) return 'recommended';
  return 'optional';
};

const ColumnMappingDialog = ({ open, onOpenChange, csvHeaders, onConfirm }: ColumnMappingDialogProps) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
  
  // Field groups with better organization
  const fieldGroups = [
    {
      label: "Order Information",
      fields: [
        { key: "orderId", label: "Order ID" },
        { key: "trackingId", label: "Tracking ID" },
        { key: "shipDate", label: "Ship Date" },
        { key: "status", label: "Status" },
        { key: "paymentMethod", label: "Payment Method" }
      ]
    },
    {
      label: "Product Details",
      fields: [
        { key: "productName", label: "Product Name" },
        { key: "productCategory", label: "Product Category" },
        { key: "productQuantity", label: "Product Quantity" },
        { key: "productPrice", label: "Product Price" },
        { key: "orderTotal", label: "Order Total" },
        { key: "discountValue", label: "Discount Value" }
      ]
    },
    {
      label: "Shipping Information",
      fields: [
        { key: "courierCompany", label: "Courier Company" },
        { key: "weight", label: "Weight (KG)" },
        { key: "chargedWeight", label: "Charged Weight" },
        { key: "shippingCharges", label: "Shipping Charges" },
        { key: "freightTotalAmount", label: "Freight Total Amount" }
      ]
    },
    {
      label: "Customer Information",
      fields: [
        { key: "customerName", label: "Customer Name" },
        { key: "customerEmail", label: "Customer Email" },
        { key: "customerMobile", label: "Customer Mobile" },
        { key: "addressCity", label: "Address City" },
        { key: "addressState", label: "Address State" },
        { key: "addressPincode", label: "Address Pincode" }
      ]
    },
    {
      label: "COD Information",
      fields: [
        { key: "codPayableAmount", label: "COD Payable Amount" },
        { key: "remittedAmount", label: "Remitted Amount" },
        { key: "codCharges", label: "COD Charges" }
      ]
    }
  ];
  
  // Flatten the fields for validation
  const allFields = fieldGroups.flatMap(group => group.fields);
  
  // Try to auto-map fields on initial load
  useEffect(() => {
    if (!csvHeaders.length) return;
    
    const autoMapping: Record<string, string> = {};
    
    // Function to find the best match
    const findBestMatch = (targetField: string, fieldLabel: string) => {
      // Try exact match (case insensitive)
      const exactMatch = csvHeaders.find(
        header => header.toLowerCase() === fieldLabel.toLowerCase()
      );
      if (exactMatch) return exactMatch;
      
      // Try contains match (field label in header)
      const containsMatch = csvHeaders.find(
        header => header.toLowerCase().includes(fieldLabel.toLowerCase())
      );
      if (containsMatch) return containsMatch;
      
      // Try word match (e.g. "Order ID" could match "OrderID" or "ID Order")
      const words = fieldLabel.toLowerCase().split(/\s+/);
      const wordMatch = csvHeaders.find(header => {
        const headerLower = header.toLowerCase();
        return words.some(word => headerLower.includes(word));
      });
      
      // For Tracking ID, also check for "AWB", "Tracking No", etc.
      if (targetField === "trackingId") {
        const trackingAliases = ["awb", "tracking", "waybill", "consignment"];
        const trackingMatch = csvHeaders.find(header => {
          const headerLower = header.toLowerCase();
          return trackingAliases.some(alias => headerLower.includes(alias));
        });
        if (trackingMatch) return trackingMatch;
      }
      
      return wordMatch || "";
    };
    
    // Auto-map all fields
    allFields.forEach(field => {
      autoMapping[field.key] = findBestMatch(field.key, field.label);
    });
    
    setMapping(autoMapping);
    validateRequiredFields(autoMapping);
  }, [csvHeaders]);
  
  // Validate that required fields are mapped
  const validateRequiredFields = (currentMapping: Record<string, string>) => {
    const requiredFields = allFields.filter(field => 
      getFieldImportance(field.key) === 'required'
    );
    
    const missing = requiredFields
      .filter(field => !currentMapping[field.key])
      .map(field => field.label);
    
    setMissingRequiredFields(missing);
    return missing.length === 0;
  };
  
  // Handle field mapping change
  const handleFieldChange = (fieldKey: string, value: string) => {
    const newMapping = { ...mapping, [fieldKey]: value };
    setMapping(newMapping);
    validateRequiredFields(newMapping);
  };
  
  const handleConfirm = () => {
    // Validate before confirming
    const missingFields = validateRequiredFields(mapping);
    
    if (missingRequiredFields.length > 0) {
      toast.warning(`Please map all required fields before continuing`);
      return;
    }
    
    if (onConfirm) {
      onConfirm(mapping);
      toast.success('Column mapping applied successfully');
    }
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Column Mapping</DialogTitle>
          <DialogDescription>
            Map your CSV columns to the required fields for logistics analysis. This ensures your data is processed correctly.
            <div className="mt-2 text-xs text-yellow-500 font-medium">
              Note: Only records with a Tracking ID will appear in the dashboard analytics.
            </div>
          </DialogDescription>
        </DialogHeader>
        
        {missingRequiredFields.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please map these required fields: {missingRequiredFields.join(', ')}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-6 py-4">
          <TooltipProvider>
            {fieldGroups.map((group) => (
              <div key={group.label} className="space-y-4">
                <h4 className="font-medium border-b pb-1">{group.label}</h4>
                <div className="space-y-3">
                  {group.fields.map((field) => {
                    const importance = getFieldImportance(field.key);
                    return (
                      <div key={field.key} className="grid grid-cols-3 items-center gap-4">
                        <div className="flex items-center col-span-1">
                          <Label htmlFor={field.key} className="text-right mr-2">
                            {field.label} 
                            {importance === 'required' && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {fieldDescriptions[field.key] && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">{fieldDescriptions[field.key]}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="col-span-2">
                          <Select
                            value={mapping[field.key] || ""}
                            onValueChange={(value) => handleFieldChange(field.key, value)}
                          >
                            <SelectTrigger id={field.key} className={importance === 'required' ? 'border-red-200' : ''}>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not-mapped">Not mapped</SelectItem>
                              {csvHeaders.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>
        
        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-red-500/20 border border-red-500/50 mr-1"></span> Required
            <span className="inline-block w-3 h-3 bg-amber-500/20 border border-amber-500/50 mr-1 ml-4"></span> Recommended
          </div>
          <div>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
              Confirm Mapping
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnMappingDialog;
