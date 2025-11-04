import { useState } from "react";
import ArticleIdeaCard from "@/components/ArticleIdeaCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function ArticleIdeas() {
  const { toast } = useToast();
  const [pendingIdeas] = useState([
    {
      id: '1',
      headline: "The Future of AI in Web Development: What Developers Need to Know",
      confidence: 87,
      keywords: ["AI", "Web Development", "Future Tech", "Developers"],
      estimatedWords: 1500,
      seoScore: 85,
      status: "pending" as const,
    },
    {
      id: '2',
      headline: "Understanding TypeScript Generics: A Comprehensive Guide",
      confidence: 92,
      keywords: ["TypeScript", "Programming", "Generics", "Tutorial"],
      estimatedWords: 2200,
      seoScore: 88,
      status: "pending" as const,
    },
    {
      id: '3',
      headline: "Building Scalable APIs with Node.js and Express",
      confidence: 78,
      keywords: ["Node.js", "Express", "API", "Backend"],
      estimatedWords: 1800,
      seoScore: 76,
      status: "pending" as const,
    },
  ]);

  const [approvedIdeas] = useState([
    {
      id: '4',
      headline: "10 SEO Strategies That Actually Work in 2024",
      confidence: 95,
      keywords: ["SEO", "Marketing", "2024", "Strategy"],
      estimatedWords: 2000,
      seoScore: 92,
      status: "approved" as const,
      priority: 1,
      scheduledDate: "Tomorrow, 9:00 AM",
    },
    {
      id: '5',
      headline: "React Performance Optimization: Best Practices",
      confidence: 89,
      keywords: ["React", "Performance", "Optimization", "Best Practices"],
      estimatedWords: 1600,
      seoScore: 84,
      status: "approved" as const,
      priority: 2,
      scheduledDate: "Jan 20, 2:00 PM",
    },
  ]);

  const handleApprove = (id: string, headline: string) => {
    toast({
      title: "Approved",
      description: `"${headline}" has been approved for drafting.`,
    });
  };

  const handleReject = (id: string, headline: string) => {
    toast({
      title: "Rejected",
      description: `"${headline}" has been rejected.`,
      variant: "destructive",
    });
  };

  const handleEdit = () => {
    toast({
      title: "Edit Headline",
      description: "Opening headline editor...",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Article Ideas</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-generated article ideas.
          </p>
        </div>
        <Button data-testid="button-generate-more">
          Generate More Ideas
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingIdeas.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedIdeas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {pendingIdeas.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-approve-all">
                Approve All
              </Button>
              <Button variant="outline" size="sm" data-testid="button-reject-all">
                Reject All
              </Button>
            </div>
          )}
          
          <div className="grid gap-6 md:grid-cols-2">
            {pendingIdeas.map((idea) => (
              <ArticleIdeaCard
                key={idea.id}
                {...idea}
                onApprove={() => handleApprove(idea.id, idea.headline)}
                onReject={() => handleReject(idea.id, idea.headline)}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {approvedIdeas.map((idea) => (
              <ArticleIdeaCard key={idea.id} {...idea} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
