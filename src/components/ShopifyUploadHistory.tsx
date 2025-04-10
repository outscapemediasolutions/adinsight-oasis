
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc, where, writeBatch, limit, getDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { Trash, FileSpreadsheet, Download } from "lucide-react";
import EmptyState from "./EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ShopifyUploadHistoryProps {
  refreshTrigger?: number;
}

interface ShopifyUpload {
  id: string;
  filename: string;
  uploadDate: Date;
  recordCount: number;
}

const ShopifyUploadHistory = ({ refreshTrigger = 0 }: ShopifyUploadHistoryProps) => {
  const { currentUser } = useAuth();
  const [uploads, setUploads] = useState<ShopifyUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchUploads = async () => {
      setIsLoading(true);
      try {
        const uploadsRef = collection(db, "users", currentUser.uid, "shopifyUploads");
        const q = query(uploadsRef, orderBy("uploadDate", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        const uploadList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            filename: data.filename,
            uploadDate: data.uploadDate?.toDate() || new Date(),
            recordCount: data.recordCount || 0
          };
        });
        
        setUploads(uploadList);
      } catch (error) {
        console.error("Error fetching upload history:", error);
        toast.error("Failed to load upload history");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUploads();
  }, [currentUser, refreshTrigger]);
  
  const handleDeleteUpload = async (uploadId: string) => {
    if (!currentUser) return;
    
    setDeletingUploadId(uploadId);
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = async () => {
    if (!deletingUploadId || !currentUser) {
      setShowDeleteDialog(false);
      return;
    }
    
    try {
      toast.info("Deleting data...");
      
      // Delete the metadata document
      const uploadRef = doc(db, "users", currentUser.uid, "shopifyUploads", deletingUploadId);
      await deleteDoc(uploadRef);
      
      // Delete all records associated with this upload (in batches of up to 500)
      const dataRef = collection(db, "users", currentUser.uid, "shopifyData");
      const q = query(dataRef, where("uploadId", "==", deletingUploadId));
      const querySnapshot = await getDocs(q);
      
      // Process in batches of 500 as Firestore batch limit
      const batchSize = 500;
      let processed = 0;
      
      while (processed < querySnapshot.docs.length) {
        const batch = writeBatch(db);
        const docsToProcess = querySnapshot.docs.slice(processed, processed + batchSize);
        
        docsToProcess.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        processed += docsToProcess.length;
      }
      
      // Update the list
      setUploads(prevUploads => prevUploads.filter(upload => upload.id !== deletingUploadId));
      
      toast.success("Upload data deleted successfully");
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Failed to delete upload data");
    } finally {
      setDeletingUploadId(null);
      setShowDeleteDialog(false);
    }
  };
  
  return (
    <React.Fragment>
      <Card>
        <CardHeader>
          <CardTitle>Shopify Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array(5).fill(null).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-9 w-[100px]" />
                </div>
              ))}
            </div>
          ) : (
            <React.Fragment>
              {uploads.length === 0 ? (
                <EmptyState 
                  title="No upload history"
                  description="You haven't uploaded any Shopify data yet."
                  icon={<FileSpreadsheet />}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Record Count</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploads.map(upload => (
                        <TableRow key={upload.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-adpulse-green" />
                              {upload.filename}
                            </div>
                          </TableCell>
                          <TableCell>{formatDistanceToNow(upload.uploadDate)} ago</TableCell>
                          <TableCell>{upload.recordCount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteUpload(upload.id)}
                            >
                              <Trash className="h-4 w-4 text-adpulse-red" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </React.Fragment>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Upload Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this upload? This will remove all Shopify data associated with this upload.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-adpulse-red hover:bg-adpulse-red/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </React.Fragment>
  );
};

export default ShopifyUploadHistory;
