import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import HistoryTable from "@/components/HistoryTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GenerationHistory, Website } from "@shared/schema";

export default function History() {
  const { toast } = useToast();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("all");

  const { data: websites = [] } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const { data: history = [], isLoading } = useQuery<GenerationHistory[]>({
    queryKey: ["/api/websites", selectedWebsiteId, "history"],
    enabled: selectedWebsiteId !== "all" && !!selectedWebsiteId,
  });

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Website", "Action", "Article Title", "Status", "PR URL"].join(","),
      ...history.map((entry) => {
        const website = websites.find(w => w.id === entry.websiteId);
        return [
          new Date(entry.createdAt).toLocaleString(),
          website?.name || "",
          entry.action,
          entry.articleTitle || "",
          entry.status,
          entry.prUrl || "",
        ].map(val => `"${val}"`).join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generation-history-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exporting History",
      description: "Your history will be downloaded as CSV",
    });
  };

  const entries = history.map((entry) => {
    const website = websites.find(w => w.id === entry.websiteId);
    return {
      id: entry.id,
      timestamp: new Date(entry.createdAt).toLocaleString(),
      website: website?.name || "Unknown",
      action: entry.action,
      articleTitle: entry.articleTitle || "-",
      status: entry.status,
      prUrl: entry.prUrl || undefined,
    };
  });

  useEffect(() => {
    if (selectedWebsiteId === "all" && websites.length > 0) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  if (websites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please add a website first to view history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="text-muted-foreground mt-1">
            View all your content generation activity and results.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
            <SelectTrigger className="w-[200px]" data-testid="select-website">
              <SelectValue placeholder="Select website" />
            </SelectTrigger>
            <SelectContent>
              {websites.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  {website.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} data-testid="button-export" disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : entries.length > 0 ? (
        <HistoryTable entries={entries} />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No history yet for this website.</p>
        </div>
      )}
    </div>
  );
}
