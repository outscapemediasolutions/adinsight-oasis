
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvHeaders: string[];
  onConfirm?: (mapping: Record<string, string>) => void;
}

const ColumnMappingDialog = ({ open, onOpenChange, csvHeaders, onConfirm }: ColumnMappingDialogProps) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  const requiredFields = [
    { key: "orderId", label: "Order ID" },
    { key: "shipDate", label: "Ship Date" },
    { key: "status", label: "Status" },
    { key: "productName", label: "Product Name" },
    { key: "productQuantity", label: "Product Quantity" },
    { key: "orderTotal", label: "Order Total" }
  ];
  
  const optionalFields = [
    { key: "trackingId", label: "Tracking ID" },
    { key: "productCategory", label: "Product Category" },
    { key: "customerName", label: "Customer Name" },
    { key: "customerEmail", label: "Customer Email" },
    { key: "addressCity", label: "Address City" },
    { key: "addressState", label: "Address State" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "courierCompany", label: "Courier Company" },
    { key: "weight", label: "Weight (KG)" },
    { key: "chargedWeight", label: "Charged Weight" },
    { key: "codPayableAmount", label: "COD Payable Amount" },
    { key: "shippingCharges", label: "Shipping Charges" }
  ];
  
  // Try to auto-map fields on initial load
  useEffect(() => {
    if (!csvHeaders.length) return;
    
    const autoMapping: Record<string, string> = {};
    
    // Function to find the best match
    const findBestMatch = (targetField: string) => {
      // Try exact match
      const exactMatch = csvHeaders.find(
        header => header.toLowerCase() === targetField.toLowerCase()
      );
      if (exactMatch) return exactMatch;
      
      // Try contains match
      const containsMatch = csvHeaders.find(
        header => header.toLowerCase().includes(targetField.toLowerCase())
      );
      if (containsMatch) return containsMatch;
      
      // Try word match (e.g. "Order ID" could match "OrderID" or "ID Order")
      const words = targetField.toLowerCase().split(/\s+/);
      const wordMatch = csvHeaders.find(header => {
        const headerLower = header.toLowerCase();
        return words.some(word => headerLower.includes(word));
      });
      
      return wordMatch || "";
    };
    
    // Auto-map all fields
    [...requiredFields, ...optionalFields].forEach(field => {
      autoMapping[field.key] = findBestMatch(field.label);
    });
    
    setMapping(autoMapping);
  }, [csvHeaders]);
  
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(mapping);
    }
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Column Mapping</DialogTitle>
          <DialogDescription>
            Map your CSV columns to the required fields. This ensures your data is processed correctly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium">Required Fields</h4>
            {requiredFields.map((field) => (
              <div key={field.key} className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor={field.key} className="text-right">
                  {field.label} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={mapping[field.key] || ""}
                  onValueChange={(value) => setMapping({...mapping, [field.key]: value})}
                >
                  <SelectTrigger id={field.key}>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          
          <div className="space-y-4 mt-6">
            <h4 className="font-medium">Optional Fields</h4>
            {optionalFields.map((field) => (
              <div key={field.key} className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor={field.key} className="text-right">
                  {field.label}
                </Label>
                <Select
                  value={mapping[field.key] || ""}
                  onValueChange={(value) => setMapping({...mapping, [field.key]: value})}
                >
                  <SelectTrigger id={field.key}>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not mapped</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnMappingDialog;
