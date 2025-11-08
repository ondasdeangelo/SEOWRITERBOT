import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import EmptyState from "@/components/EmptyState";
import { WebsiteTable } from "@/components/WebsiteTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Plus, AlertTriangle } from "lucide-react";
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<Website | null>(null);
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
    refetchOnMount: true,
  });

  const createWebsite = useMutation({
    mutationFn: async (data: any) => {
      const websiteData = {
        name: data.name,
        url: data.url,
        keywords: data.keywords ? data.keywords.split(",").map((k: string) => k.trim()) : [],
        tone: data.tone || null,
        audience: data.audience || null,
        githubRepo: data.githubRepo || null,
        githubBranch: data.githubBranch || "main",
        githubPath: data.githubPath || "blog",
        status: "active" as const
      };
      return apiRequest<Website>("/api/websites", "POST", websiteData);
    },
    onMutate: async (newWebsite) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/websites"] });
      
      // Snapshot the previous value
      const previousWebsites = queryClient.getQueryData<Website[]>(["/api/websites"]);
      
      // Optimistically update to the new value
      const optimisticWebsite: Website = {
        id: `temp-${Date.now()}`,
        userId: "",
        name: newWebsite.name,
        url: newWebsite.url,
        keywords: newWebsite.keywords ? newWebsite.keywords.split(",").map((k: string) => k.trim()) : [],
        tone: newWebsite.tone || null,
        audience: newWebsite.audience || null,
        status: "active",
        githubRepo: newWebsite.githubRepo || null,
        githubBranch: newWebsite.githubBranch || "main",
        githubPath: newWebsite.githubPath || "blog",
        totalArticles: 0,
        lastGenerated: null,
        nextScheduled: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData<Website[]>(["/api/websites"], (old = []) => [optimisticWebsite, ...old]);
      
      return { previousWebsites };
    },
    onSuccess: (newWebsite) => {
      // Replace optimistic update with real data
      queryClient.setQueryData<Website[]>(["/api/websites"], (old = []) => {
        const filtered = old.filter(w => !w.id.startsWith("temp-"));
        return [newWebsite, ...filtered];
      });
      
      // Invalidate to ensure we have the latest data
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
      
      // Automatically generate ideas for the newly created website
      generateIdeas.mutate({ websiteId: newWebsite.id, silent: true }, {
        onSuccess: (data) => {
          toast({
            title: "Website Added & Ideas Generated",
            description: `Your website has been added and ${data.result.length} article ideas have been generated!`,
          });
        },
        onError: (error: any) => {
          toast({
            title: "Website Added",
            description: "Your website has been added, but idea generation failed. You can generate ideas manually later.",
            variant: "destructive",
          });
        },
      });
    },
    onError: (error: any, _newWebsite, context) => {
      // Rollback to previous value on error
      if (context?.previousWebsites) {
        queryClient.setQueryData(["/api/websites"], context.previousWebsites);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add website",
        variant: "destructive",
      });
    },
  });

  const generateIdeas = useMutation({
    mutationFn: async ({ websiteId, silent = false }: { websiteId: string; silent?: boolean }) => {
      const result = await apiRequest(`/api/websites/${websiteId}/generate-ideas`, "POST", { count: 5 });
      return { result, silent };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", variables.websiteId, "ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      if (!data.silent) {
        toast({
          title: "Ideas Generated",
          description: `Generated ${data.result.length} new article ideas!`,
        });
      }
    },
    onError: (error: any, variables) => {
      if (!variables.silent) {
        toast({
          title: "Error",
          description: error.message || "Failed to generate ideas",
          variant: "destructive",
        });
      }
    },
  });

  const deleteWebsite = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/websites/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeleteDialogOpen(false);
      setWebsiteToDelete(null);
      toast({
        title: "Website Deleted",
        description: `"${websiteToDelete?.name || 'The website'}" has been deleted successfully.`,
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

  const handleDeleteClick = (id: string) => {
    const website = websites.find(w => w.id === id);
    if (website) {
      setWebsiteToDelete(website);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (websiteToDelete) {
      deleteWebsite.mutate(websiteToDelete.id);
    }
  };

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
        <WebsiteTable 
          websites={websites}
          onGenerate={(id) => generateIdeas.mutate({ websiteId: id, silent: false })}
          onConfigure={(website) => setLocation(`/websites/${website.id}/config`)}
          onDelete={handleDeleteClick}
        />
      ) : (
        <EmptyState
          icon={Globe}
          title="No websites yet"
          description="Get started by adding your first website to begin generating SEO-optimized content."
          actionLabel="Add Your First Website"
          onAction={() => setOpen(true)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle>Delete Website</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Are you sure you want to delete this website? This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {websiteToDelete && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Website Details:</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Name:</span> {websiteToDelete.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">URL:</span> {websiteToDelete.url}
                </p>
                {websiteToDelete.totalArticles > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <span className="font-semibold">Warning:</span> This website has {websiteToDelete.totalArticles} article{websiteToDelete.totalArticles !== 1 ? 's' : ''} associated with it.
                  </p>
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWebsiteToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteWebsite.isPending}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {deleteWebsite.isPending ? (
                <>
                  <span className="mr-2">Deleting...</span>
                </>
              ) : (
                "Delete Website"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
