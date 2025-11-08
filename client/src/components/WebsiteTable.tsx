import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Play, Settings, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Website } from "@shared/schema";
import { Badge } from "./ui/badge";

interface WebsiteTableProps {
  websites: Website[];
  onGenerate: (id: string) => void;
  onConfigure: (website: Website) => void;
  onDelete: (id: string) => void;
}

export function WebsiteTable({ websites, onGenerate, onConfigure, onDelete }: WebsiteTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Repository</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {websites.map((website) => (
            <TableRow key={website.id}>
              <TableCell>{website.name}</TableCell>
              <TableCell>
                <a 
                  href={website.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {new URL(website.url).hostname}
                </a>
              </TableCell>
              <TableCell>
                {website.githubRepo ? (
                  <a 
                    href={`https://github.com/${website.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {website.githubRepo}
                  </a>
                ) : (
                  <span className="text-gray-400">Not configured</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={
                  website.status === 'active' ? 'default' :
                  website.status === 'paused' ? 'secondary' :
                  'destructive'
                }>
                  {website.status}
                </Badge>
              </TableCell>
              <TableCell>{website.totalArticles}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onConfigure(website)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onGenerate(website.id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Ideas
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(website.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}