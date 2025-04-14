
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { collection, query, where, getDocs, orderBy, limit, Timestamp, DocumentData } from "firebase/firestore";
import { format } from "date-fns";
import { RefreshCw, Upload, RotateCcw, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ShippingAnalyticsSummary } from "./ShippingAnalyticsSummary";
import { ShippingCharts } from "./charts/ShippingCharts";
import { calculateMetrics, ShippingMetrics } from "./utils/calculateMetrics";

interface ShippingDashboardProps {
  dateRange: { start?: Date; end?: Date };
}

export interface ShippingOrder {
  id: string;
  orderId: string;
  trackingId: string;
  shipDate: Date;
  status: string;
  productName: string;
  productCategory: string;
  productQuantity: number;
  customerName: string;
  customerEmail: string;
  addressState: string;
  addressCity: string;
  paymentMethod: string;
  orderTotal: number;
  discountValue: number;
  weight: number;
  chargedWeight: number;
  courierCompany: string;
  codPayableAmount: number;
  remittedAmount: number;
  codCharges: number;
  shippingCharges: number;
  freightTotalAmount: number;
}

// Define a type for the Firestore document data
interface ShippingDocumentData extends DocumentData {
  orderId?: string;
  trackingId?: string;
  shipDate?: Timestamp | Date | string;
  status?: string;
  productName?: string;
  productCategory?: string;
  productQuantity?: string | number;
  customerName?: string;
  customerEmail?: string;
  addressState?: string;
  addressCity?: string;
  paymentMethod?: string;
  orderTotal?: string | number;
  discountValue?: string | number;
  weight?: string | number;
  chargedWeight?: string | number;
  courierCompany?: string;
  codPayableAmount?: string | number;
  remittedAmount?: string | number;
  codCharges?: string | number;
  shippingCharges?: string | number;
  freightTotalAmount?: string | number;
}

const ShippingDashboard = ({ dateRange }: ShippingDashboardProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [metrics, setMetrics] = useState<ShippingMetrics | null>(null);
  const [hasData, setHasData] = useState(false);
  
  useEffect(() => {
    if (!currentUser) return;
    
    console.log("Fetching shipping data with date range:", dateRange);
    fetchShippingData();
  }, [currentUser, dateRange]);
  
  const fetchShippingData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      console.log("Starting data fetch from Firestore...");
      const shippingDataRef = collection(db, "users", currentUser.uid, "shippingData");
      
      // First check if any data exists overall
      const checkDataQuery = query(shippingDataRef, limit(1));
      const checkSnapshot = await getDocs(checkDataQuery);
      const hasAnyData = !checkSnapshot.empty;
      console.log("Has any data:", hasAnyData);
      setHasData(hasAnyData);
      
      if (!hasAnyData) {
        setOrders([]);
        setMetrics(null);
        setIsLoading(false);
        return;
      }
      
      // Build query with optional date filters
      let q;
      
      if (dateRange.start && dateRange.end) {
        console.log("Filtering by date range:", dateRange.start, "to", dateRange.end);
        q = query(
          shippingDataRef,
          where("shipDate", ">=", dateRange.start),
          where("shipDate", "<=", dateRange.end),
          orderBy("shipDate", "desc")
        );
      } else {
        console.log("No date range filter, fetching all data");
        q = query(shippingDataRef, orderBy("shipDate", "desc"));
      }
      
      const querySnapshot = await getDocs(q);
      console.log(`Fetched ${querySnapshot.size} documents from Firestore`);
      
      if (querySnapshot.empty) {
        setOrders([]);
        setMetrics(null);
        setIsLoading(false);
        return;
      }
      
      // Process orders
      const processedOrders: ShippingOrder[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data() as ShippingDocumentData;
        console.log("Processing document:", doc.id);
        
        // Convert date strings or Firestore timestamps to Date objects
        let shipDate: Date;
        try {
          if (data.shipDate instanceof Timestamp) {
            shipDate = data.shipDate.toDate();
          } else if (data.shipDate instanceof Date) {
            shipDate = data.shipDate;
          } else if (typeof data.shipDate === 'string') {
            shipDate = new Date(data.shipDate);
          } else {
            shipDate = new Date();
          }
        } catch (e) {
          console.error("Error processing date:", e);
          shipDate = new Date();
        }
        
        // Create order object with proper type conversions
        const order: ShippingOrder = {
          id: doc.id,
          orderId: data.orderId || "",
          trackingId: data.trackingId || "",
          shipDate,
          status: data.status || "",
          productName: data.productName || "",
          productCategory: data.productCategory || "",
          productQuantity: typeof data.productQuantity === 'string' ? parseInt(data.productQuantity) : Number(data.productQuantity || 0),
          customerName: data.customerName || "",
          customerEmail: data.customerEmail || "",
          addressState: data.addressState || "",
          addressCity: data.addressCity || "",
          paymentMethod: data.paymentMethod || "",
          orderTotal: typeof data.orderTotal === 'string' ? parseFloat(data.orderTotal) : Number(data.orderTotal || 0),
          discountValue: typeof data.discountValue === 'string' ? parseFloat(data.discountValue) : Number(data.discountValue || 0),
          weight: typeof data.weight === 'string' ? parseFloat(data.weight) : Number(data.weight || 0),
          chargedWeight: typeof data.chargedWeight === 'string' ? parseFloat(data.chargedWeight) : Number(data.chargedWeight || 0),
          courierCompany: data.courierCompany || "",
          codPayableAmount: typeof data.codPayableAmount === 'string' ? parseFloat(data.codPayableAmount) : Number(data.codPayableAmount || 0),
          remittedAmount: typeof data.remittedAmount === 'string' ? parseFloat(data.remittedAmount) : Number(data.remittedAmount || 0),
          codCharges: typeof data.codCharges === 'string' ? parseFloat(data.codCharges) : Number(data.codCharges || 0),
          shippingCharges: typeof data.shippingCharges === 'string' ? parseFloat(data.shippingCharges) : Number(data.shippingCharges || 0),
          freightTotalAmount: typeof data.freightTotalAmount === 'string' ? parseFloat(data.freightTotalAmount) : Number(data.freightTotalAmount || 0)
        };
        
        processedOrders.push(order);
      });
      
      console.log(`Successfully processed ${processedOrders.length} orders`);
      setOrders(processedOrders);
      
      // Calculate metrics using our utility function
      const calculatedMetrics = calculateMetrics(processedOrders);
      setMetrics(calculatedMetrics);
      
    } catch (error) {
      console.error("Error fetching shipping data:", error);
      toast.error("Failed to load shipping data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    fetchShippingData();
  };
  
  const handleUploadClick = () => {
    navigate("/shipping-analytics", { 
      state: { defaultTab: "upload" } 
    });
  };
  
  const handleResetDateRange = () => {
    navigate("/shipping-analytics");
  };
  
  if (!isLoading && orders.length === 0) {
    // Handle different empty state scenarios
    if (hasData && dateRange.start && dateRange.end) {
      // If we have data overall but none in the selected date range
      return (
        <Card className="p-8 text-center border border-muted/20 bg-card/90 backdrop-blur-sm">
          <h3 className="text-lg font-medium mb-2">No data available for the selected date range</h3>
          <p className="text-muted-foreground mb-4">Try selecting a different date range or reset to view all data</p>
          <Button onClick={handleResetDateRange} className="bg-white/10 hover:bg-white/20 text-white">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Date Range
          </Button>
        </Card>
      );
    } else if (!hasData) {
      // If no data at all, show upload button
      return (
        <Card className="p-8 text-center border border-muted/20 bg-card/90 backdrop-blur-sm">
          <h3 className="text-lg font-medium mb-2">No shipping data available</h3>
          <p className="text-muted-foreground mb-4">Upload your shipping data to see insights and analytics</p>
          <Button onClick={handleUploadClick} className="bg-[#9b87f5] hover:bg-[#7E69AB]">
            <Upload className="mr-2 h-4 w-4" />
            Upload Shipping Data
          </Button>
        </Card>
      );
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      
      <ShippingAnalyticsSummary metrics={metrics} isLoading={isLoading} />
      
      <ShippingCharts metrics={metrics} isLoading={isLoading} />
    </div>
  );
};

export default ShippingDashboard;
