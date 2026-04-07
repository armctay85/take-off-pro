import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, Users, Zap, ExternalLink } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Header with Develoop branding */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-muted-foreground">Develoop</span>
          </div>
          <a 
            href="https://develoop.com.au" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            develoop.com.au <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Take-off Pro
          </h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Professional project management with critical path analysis, resource tracking, and real-time collaboration
          </p>
          <p className="text-sm text-muted-foreground/70 mb-8">
            A product of <a href="https://develoop.com.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Develoop Pty Ltd</a> — ABN 30 140 738 615
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card data-testid="card-feature-tasks">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Task Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track tasks with dependencies and completion status
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-critical-path">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Critical Path</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze project timelines and identify bottlenecks
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-resources">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Resource Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage team members and track costs per hour
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-collaboration">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Zap className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
                <p className="text-sm text-muted-foreground">
                  See who's online and get instant task notifications
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer with Develoop branding */}
        <div className="border-t pt-8 mt-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Develoop Pty Ltd</span>
              <span className="text-muted-foreground/50">|</span>
              <span>ABN 30 140 738 615</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://develoop.com.au" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                develoop.com.au <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground/50 mt-4">
            © {new Date().getFullYear()} Develoop Pty Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
