"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Mail } from "lucide-react";
import { format } from "date-fns";

type Admin = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
};

export default function AdminAccountsClient({ admins }: { admins: Admin[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Users</CardTitle>
        <CardDescription>View and manage admin user accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No admin accounts found.
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="space-y-3 md:hidden">
              {admins.map((admin) => (
                <Card key={admin.id} className="rounded-lg">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{admin.name || "No name"}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate">{admin.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {admin.isActive ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {admin.isEmailVerified ? (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Created: {format(new Date(admin.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Email Verified</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[220px]">{admin.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{admin.name || "-"}</TableCell>
                      <TableCell>
                        {admin.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.isEmailVerified ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(admin.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Admin accounts are created via database seeding or direct database
            access. To create a new admin account, use the seed script or database tools.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

