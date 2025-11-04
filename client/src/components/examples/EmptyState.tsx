import EmptyState from '../EmptyState';
import { Globe } from 'lucide-react';

export default function EmptyStateExample() {
  return (
    <div className="p-6">
      <EmptyState
        icon={Globe}
        title="No websites yet"
        description="Get started by adding your first website to begin generating SEO-optimized content."
        actionLabel="Add Your First Website"
        onAction={() => console.log('Add website clicked')}
      />
    </div>
  );
}
