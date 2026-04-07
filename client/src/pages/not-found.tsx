import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft, FolderKanban } from "lucide-react";
import { motion } from "framer-motion";
import { CompactFooter } from "@/components/footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted">
      <motion.div
        className="flex-1 flex items-center justify-center p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            {/* Icon */}
            <motion.div
              className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <AlertCircle className="h-10 w-10 text-destructive" />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-4xl font-bold text-foreground mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              404
            </motion.h1>

            <motion.h2
              className="text-xl font-semibold text-foreground mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Page Not Found
            </motion.h2>

            <motion.p
              className="text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/">
                <Button className="gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="outline" className="gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Projects
                </Button>
              </Link>
            </motion.div>

            {/* Back button */}
            <motion.div
              className="mt-6 pt-6 border-t"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <CompactFooter />
    </div>
  );
}
