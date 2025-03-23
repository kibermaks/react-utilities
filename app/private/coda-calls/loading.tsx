import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { Phone } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header title="Coda Calls" icon={<Phone className="w-6 h-6" />} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Title Skeleton */}
              <div className="flex justify-center">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>

              {/* Call Type Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Way Section Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Duration Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Rating Skeleton */}
              <div className="flex justify-center space-x-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                ))}
              </div>

              {/* DateTime Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>

              {/* Comments Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>

              {/* Submit Button Skeleton */}
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 