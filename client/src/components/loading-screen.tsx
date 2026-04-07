import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = "Loading Take-off Pro...", 
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClasses = fullScreen 
    ? "min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted"
    : "w-full h-full flex items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <div className="text-center space-y-6">
        {/* Develoop Logo Animation */}
        <motion.div
          className="relative mx-auto w-20 h-20"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="absolute inset-0 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-3xl">D</span>
          </div>
          <motion.div
            className="absolute -inset-2 bg-primary/20 rounded-xl -z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* App Name */}
        <div className="space-y-2">
          <motion.h1
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Take-off Pro
          </motion.h1>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            by{" "}
            <a
              href="https://develoop.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Develoop
            </a>
          </motion.p>
        </div>

        {/* Loading Bar */}
        <motion.div
          className="w-48 h-1 bg-muted rounded-full mx-auto overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "50%", "100%", "0%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Loading Message */}
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}

// Skeleton loading component for content areas
export function ContentSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}

// Card skeleton for dashboard/grid items
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border rounded-lg p-6 space-y-4 animate-pulse">
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default LoadingScreen;
