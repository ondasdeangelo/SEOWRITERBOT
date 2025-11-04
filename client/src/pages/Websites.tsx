import { useState } from "react";
import WebsiteCard from "@/components/WebsiteCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Globe, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Websites() {
  const { toast } = useToast();
  const [websites] = useState([
    {
      id: '1',
      name: "Tech Blog",
      url: "https://techblog.example.com",
      keywords: ["AI", "Machine Learning", "Web Development"],
      status: "active" as const,
      lastGenerated: "2 hours ago",
      totalArticles: 24,
      nextScheduled: "Tomorrow, 9:00 AM",
    },
    {
      id: '2',
      name: "Marketing Hub",
      url: "https://marketing.example.com",
      keywords: ["SEO", "Content Marketing", "Digital Strategy"],
      status: "paused" as const,
      lastGenerated: "3 days ago",
      totalArticles: 15,
      nextScheduled: "Paused",
    },
    {
      id: '3',
      name: "Developer Insights",
      url: "https://devinsights.example.com",
      keywords: ["JavaScript", "React", "TypeScript", "Node.js"],
      status: "active" as const,
      lastGenerated: "1 hour ago",
      totalArticles: 32,
      nextScheduled: "Today, 6:00 PM",
    },
  ]);

  const handleConfigure = (name: string) => {
    toast({
      title: "Configure Website",
      description: `Opening configuration for ${name}`,
    });
  };

  const handleGenerate = (name: string) => {
    toast({
      title: "Generating Ideas",
      description: `Starting generation for ${name}`,
    });
  };

  const handleDelete = (name: string) => {
    toast({
      title: "Delete Website",
      description: `This would delete ${name}`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Websites</h1>
          <p className="text-muted-foreground mt-1">
            Manage your websites and their SEO content settings.
          </p>
        </div>
        <Button data-testid="button-add-website">
          <Plus className="h-4 w-4 mr-2" />
          Add Website
        </Button>
      </div>

      {websites.length > 0 ? (
        <div className="space-y-4">
          {websites.map((website) => (
            <WebsiteCard
              key={website.id}
              {...website}
              onConfigure={() => handleConfigure(website.name)}
              onGenerate={() => handleGenerate(website.name)}
              onDelete={() => handleDelete(website.name)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Globe}
          title="No websites yet"
          description="Get started by adding your first website to begin generating SEO-optimized content."
          actionLabel="Add Your First Website"
          onAction={() => console.log('Add website')}
        />
      )}
    </div>
  );
}
