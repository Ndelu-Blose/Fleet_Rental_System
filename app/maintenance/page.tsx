import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
            <h1 className="text-2xl font-bold">System Maintenance</h1>
            <p className="text-muted-foreground">
              The system is currently undergoing maintenance. Please check back later.
            </p>
            <p className="text-sm text-muted-foreground">
              If you need immediate assistance, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

