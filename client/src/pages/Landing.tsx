import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, Users, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Take-off Pro
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Professional project management with critical path analysis, resource tracking, and real-time collaboration
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

        <div className="text-center text-sm text-muted-foreground">
          <p>Built with modern technologies for maximum performance</p>
        </div>
      </div>
    </div>
  );
}
