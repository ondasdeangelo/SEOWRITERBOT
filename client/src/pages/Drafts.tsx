import { useState } from "react";
import DraftCard from "@/components/DraftCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Drafts() {
  const { toast } = useToast();
  const [drafts] = useState([
    {
      id: '1',
      title: "The Future of AI in Web Development",
      excerpt: "Artificial intelligence is revolutionizing how we build and maintain websites. From automated testing to intelligent code completion, AI tools are becoming indispensable...",
      wordCount: 1543,
      readabilityScore: 78,
      keywordDensity: 2.3,
      status: "draft" as const,
    },
    {
      id: '2',
      title: "Understanding TypeScript Generics",
      excerpt: "TypeScript generics provide a powerful way to create reusable components that work with multiple types while maintaining type safety...",
      wordCount: 2087,
      readabilityScore: 72,
      keywordDensity: 3.5,
      status: "review" as const,
    },
    {
      id: '3',
      title: "10 SEO Strategies That Actually Work in 2024",
      excerpt: "Search engine optimization continues to evolve. Here are the most effective strategies that will help your content rank higher and attract more organic traffic...",
      wordCount: 2156,
      readabilityScore: 85,
      keywordDensity: 3.1,
      status: "pr_created" as const,
      prUrl: "https://github.com/user/repo/pull/123",
    },
    {
      id: '4',
      title: "React Performance Optimization Best Practices",
      excerpt: "Performance is critical for modern web applications. Learn how to optimize your React applications for better user experience and SEO...",
      wordCount: 1789,
      readabilityScore: 81,
      keywordDensity: 2.8,
      status: "merged" as const,
      prUrl: "https://github.com/user/repo/pull/120",
    },
  ]);

  const handleView = (title: string) => {
    toast({
      title: "View Draft",
      description: `Opening "${title}"`,
    });
  };

  const handleEdit = (title: string) => {
    toast({
      title: "Edit Draft",
      description: `Editing "${title}"`,
    });
  };

  const handlePush = (title: string) => {
    toast({
      title: "Pushing to GitHub",
      description: `Creating pull request for "${title}"`,
    });
  };

  const handleDownload = (title: string) => {
    toast({
      title: "Download",
      description: `Downloading "${title}.mdx"`,
    });
  };

  const draftsByStatus = {
    draft: drafts.filter(d => d.status === "draft"),
    review: drafts.filter(d => d.status === "review"),
    pr_created: drafts.filter(d => d.status === "pr_created"),
    merged: drafts.filter(d => d.status === "merged"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Drafts</h1>
          <p className="text-muted-foreground mt-1">
            Manage and publish your AI-generated article drafts.
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({drafts.length})
          </TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">
            Draft ({draftsByStatus.draft.length})
          </TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">
            Review ({draftsByStatus.review.length})
          </TabsTrigger>
          <TabsTrigger value="published" data-testid="tab-published">
            Published ({draftsByStatus.pr_created.length + draftsByStatus.merged.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="grid gap-6 md:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              {...draft}
              onView={() => handleView(draft.title)}
              onEdit={() => handleEdit(draft.title)}
              onPushToGitHub={() => handlePush(draft.title)}
              onDownload={() => handleDownload(draft.title)}
            />
          ))}
        </TabsContent>

        <TabsContent value="draft" className="grid gap-6 md:grid-cols-2">
          {draftsByStatus.draft.map((draft) => (
            <DraftCard
              key={draft.id}
              {...draft}
              onView={() => handleView(draft.title)}
              onEdit={() => handleEdit(draft.title)}
              onPushToGitHub={() => handlePush(draft.title)}
              onDownload={() => handleDownload(draft.title)}
            />
          ))}
        </TabsContent>

        <TabsContent value="review" className="grid gap-6 md:grid-cols-2">
          {draftsByStatus.review.map((draft) => (
            <DraftCard
              key={draft.id}
              {...draft}
              onView={() => handleView(draft.title)}
              onEdit={() => handleEdit(draft.title)}
              onPushToGitHub={() => handlePush(draft.title)}
              onDownload={() => handleDownload(draft.title)}
            />
          ))}
        </TabsContent>

        <TabsContent value="published" className="grid gap-6 md:grid-cols-2">
          {[...draftsByStatus.pr_created, ...draftsByStatus.merged].map((draft) => (
            <DraftCard
              key={draft.id}
              {...draft}
              onView={() => handleView(draft.title)}
              onEdit={() => handleEdit(draft.title)}
              onDownload={() => handleDownload(draft.title)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
