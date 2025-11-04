import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import WebsiteCard from "@/components/WebsiteCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Website } from "@shared/schema";

const formatRelativeTime = (date: Date | string | null): string => {
  if (!date) return "Just now";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

export default function Websites() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    keywords: "",
    tone: "",
    audience: "",
    githubRepo: "",
    githubBranch: "main",
    githubPath: "blog",
  });

  const { data: websites = [], isLoading } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const createWebsite = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/websites", "POST", {
        ...data,
        keywords: data.keywords.split(",").map((k: string) => k.trim()),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setOpen(false);
      setFormData({
        name: "",
        url: "",
        keywords: "",
        tone: "",
        audience: "",
        githubRepo: "",
        githubBranch: "main",
        githubPath: "blog",
      });
      toast({
        title: "Website Added",
        description: "Your website has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add website",
        variant: "destructive",
      });
    },
  });

  const generateIdeas = useMutation({
    mutationFn: async (websiteId: string) => {
      const response = await apiRequest(`/api/websites/${websiteId}/generate-ideas`, "POST", { count: 5 });
      return response.json();
    },
    onSuccess: (data, websiteId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", websiteId, "ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      toast({
        title: "Ideas Generated",
        description: `Generated ${data.length} new article ideas!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate ideas",
        variant: "destructive",
      });
    },
  });

  const deleteWebsite = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/websites/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Website Deleted",
        description: "The website has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete website",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWebsite.mutate(formData);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Websites</h1>
          <p className="text-muted-foreground mt-1">
            Manage your websites and their SEO content settings.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-website">
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Website</DialogTitle>
              <DialogDescription>
                Configure your website's SEO context and GitHub settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Website Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tech Blog"
                    required
                    data-testid="input-website-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    required
                    data-testid="input-website-url"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Target Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="AI, Machine Learning, Web Development"
                  data-testid="input-keywords"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Input
                    id="tone"
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    placeholder="Professional and informative"
                    data-testid="input-tone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    placeholder="Developers and tech enthusiasts"
                    data-testid="input-audience"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="githubRepo">GitHub Repository (owner/repo)</Label>
                <Input
                  id="githubRepo"
                  value={formData.githubRepo}
                  onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                  placeholder="username/repo-name"
                  data-testid="input-github-repo"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="githubBranch">Branch</Label>
                  <Input
                    id="githubBranch"
                    value={formData.githubBranch}
                    onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
                    placeholder="main"
                    data-testid="input-github-branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubPath">Content Path</Label>
                  <Input
                    id="githubPath"
                    value={formData.githubPath}
                    onChange={(e) => setFormData({ ...formData, githubPath: e.target.value })}
                    placeholder="blog"
                    data-testid="input-github-path"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createWebsite.isPending} data-testid="button-submit-website">
                  {createWebsite.isPending ? "Adding..." : "Add Website"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {websites.length > 0 ? (
        <div className="space-y-4">
          {websites.map((website) => (
            <WebsiteCard
              key={website.id}
              name={website.name}
              url={website.url}
              keywords={website.keywords}
              status={website.status}
              lastGenerated={website.lastGenerated ? formatRelativeTime(website.lastGenerated) : "Never"}
              totalArticles={website.totalArticles}
              nextScheduled={website.nextScheduled ? new Date(website.nextScheduled).toLocaleDateString() : "Not scheduled"}
              onConfigure={() => console.log("Configure", website.id)}
              onGenerate={() => generateIdeas.mutate(website.id)}
              onDelete={() => deleteWebsite.mutate(website.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Globe}
          title="No websites yet"
          description="Get started by adding your first website to begin generating SEO-optimized content."
          actionLabel="Add Your First Website"
          onAction={() => setOpen(true)}
        />
      )}
    </div>
  );
}
