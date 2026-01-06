import Link from "next/link";
import { UserPlus, Car, FileText, DollarSign, ArrowRight } from "lucide-react";

export default function QuickActions() {
  const actions = [
    { 
      label: "Add Driver", 
      href: "/admin/drivers", 
      hint: "Create a new driver profile",
      icon: <UserPlus className="h-5 w-5" />
    },
    { 
      label: "Add Vehicle", 
      href: "/admin/vehicles", 
      hint: "Register a new vehicle",
      icon: <Car className="h-5 w-5" />
    },
    { 
      label: "Create Contract", 
      href: "/admin/contracts", 
      hint: "Assign driver to vehicle",
      icon: <FileText className="h-5 w-5" />
    },
    { 
      label: "Record Payment", 
      href: "/admin/payments", 
      hint: "Capture cash/EFT payment",
      icon: <DollarSign className="h-5 w-5" />
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <p className="text-sm text-muted-foreground">Shortcuts for common admin tasks.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group rounded-md border p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all">
                {a.icon}
              </div>
              <div className="font-medium">{a.label}</div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{a.hint}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

