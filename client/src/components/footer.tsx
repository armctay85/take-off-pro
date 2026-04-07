import { ExternalLink, Github, Linkedin, Mail } from "lucide-react";

interface FooterProps {
  variant?: "light" | "dark" | "sidebar";
}

export function Footer({ variant = "light" }: FooterProps) {
  const year = new Date().getFullYear();

  const baseClasses = {
    light: "bg-muted/50 border-t",
    dark: "bg-card border-t",
    sidebar: "bg-sidebar border-t border-sidebar-border",
  };

  const textClasses = {
    light: "text-muted-foreground",
    dark: "text-muted-foreground",
    sidebar: "text-sidebar-foreground/70",
  };

  return (
    <footer className={`${baseClasses[variant]} py-4 px-6`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left side - Branding */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">D</span>
          </div>
          <div className={`text-sm ${textClasses[variant]}`}>
            <span className="font-semibold">Develoop Pty Ltd</span>
            <span className="mx-2">•</span>
            <span className="text-xs">ABN 30 140 738 615</span>
          </div>
        </div>

        {/* Center - Links */}
        <div className="flex items-center gap-4">
          <a
            href="https://develoop.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${textClasses[variant]} hover:text-primary transition-colors flex items-center gap-1`}
          >
            Website
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="mailto:info@develoop.com.au"
            className={`text-xs ${textClasses[variant]} hover:text-primary transition-colors flex items-center gap-1`}
          >
            <Mail className="h-3 w-3" />
            Contact
          </a>
        </div>

        {/* Right side - Copyright */}
        <p className={`text-xs ${textClasses[variant]}`}>
          © {year} All rights reserved
        </p>
      </div>
    </footer>
  );
}

// Compact footer for use in smaller spaces
export function CompactFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-3 px-4 border-t bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary/80 rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-[10px]">D</span>
          </div>
          <span className="text-xs text-muted-foreground">Develoop</span>
        </div>
        <span className="text-[10px] text-muted-foreground/70">
          © {year} ABN 30 140 738 615
        </span>
      </div>
    </footer>
  );
}

export default Footer;
