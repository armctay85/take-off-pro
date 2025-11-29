import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

async function fetchUser(): Promise<User | null> {
  const res = await fetch("/api/auth/user", {
    credentials: "include",
  });
  
  if (!res.ok) {
    return null;
  }
  
  const data = await res.json();
  return data;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: Infinity,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}
