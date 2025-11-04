import { useState } from "react";
import HistoryTable from "@/components/HistoryTable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const { toast } = useToast();
  const [entries] = useState([
    {
      id: '1',
      timestamp: '2024-01-15 14:30',
      website: 'Tech Blog',
      action: 'Draft Created',
      articleTitle: 'The Future of AI in Web Development',
      status: 'success' as const,
      prUrl: 'https://github.com/user/repo/pull/123',
    },
    {
      id: '2',
      timestamp: '2024-01-15 12:15',
      website: 'Marketing Hub',
      action: 'Article Generated',
      articleTitle: '10 SEO Strategies That Actually Work',
      status: 'success' as const,
    },
    {
      id: '3',
      timestamp: '2024-01-15 10:00',
      website: 'Tech Blog',
      action: 'Ideas Generated',
      articleTitle: 'Understanding Machine Learning Basics',
      status: 'pending' as const,
    },
    {
      id: '4',
      timestamp: '2024-01-14 16:45',
      website: 'Marketing Hub',
      action: 'Draft Created',
      articleTitle: 'Content Marketing Trends 2024',
      status: 'failed' as const,
    },
    {
      id: '5',
      timestamp: '2024-01-14 14:20',
      website: 'Developer Insights',
      action: 'PR Merged',
      articleTitle: 'React Performance Optimization',
      status: 'success' as const,
      prUrl: 'https://github.com/user/repo/pull/120',
    },
    {
      id: '6',
      timestamp: '2024-01-14 11:30',
      website: 'Tech Blog',
      action: 'Draft Created',
      articleTitle: 'TypeScript Generics Guide',
      status: 'success' as const,
      prUrl: 'https://github.com/user/repo/pull/121',
    },
  ]);

  const handleExport = () => {
    toast({
      title: "Exporting History",
      description: "Your history will be downloaded as CSV",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="text-muted-foreground mt-1">
            View all your content generation activity and results.
          </p>
        </div>
        <Button onClick={handleExport} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <HistoryTable entries={entries} />
    </div>
  );
}
