import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  GitFork,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Resources", href: "/resources", icon: Users },
  { name: "Critical Path", href: "/projects/critical-path", icon: GitFork }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">Take-off Pro</h1>
      </div>
      <nav className="p-4 flex-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || user.email || 'User'} style={{ objectFit: 'cover' }} />
              <AvatarFallback>
                {user.firstName?.[0]}{user.lastName?.[0] || user.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
