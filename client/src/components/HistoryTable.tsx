import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface HistoryEntry {
  id: string;
  timestamp: string;
  website: string;
  action: string;
  articleTitle: string;
  status: "success" | "failed" | "pending";
  prUrl?: string;
}

interface HistoryTableProps {
  entries: HistoryEntry[];
}

const statusColors = {
  success: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

export default function HistoryTable({ entries }: HistoryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Article Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>PR Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} data-testid={`history-row-${entry.id}`}>
              <TableCell className="text-sm text-muted-foreground">
                {entry.timestamp}
              </TableCell>
              <TableCell className="font-medium">{entry.website}</TableCell>
              <TableCell className="text-sm">{entry.action}</TableCell>
              <TableCell className="max-w-md truncate">{entry.articleTitle}</TableCell>
              <TableCell>
                <Badge className={statusColors[entry.status]} variant="secondary">
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell>
                {entry.prUrl ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    data-testid={`button-pr-${entry.id}`}
                  >
                    <a href={entry.prUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
