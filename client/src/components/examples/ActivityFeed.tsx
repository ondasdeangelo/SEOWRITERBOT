import ActivityFeed from '../ActivityFeed';

export default function ActivityFeedExample() {
  const activities = [
    {
      id: '1',
      type: 'generated' as const,
      title: 'Generated 5 new article ideas',
      timestamp: '5 minutes ago',
      website: 'Tech Blog',
    },
    {
      id: '2',
      type: 'approved' as const,
      title: 'Approved "The Future of AI in Web Development"',
      timestamp: '1 hour ago',
      website: 'Tech Blog',
    },
    {
      id: '3',
      type: 'draft_created' as const,
      title: 'Draft created for "10 SEO Strategies"',
      timestamp: '2 hours ago',
      website: 'Marketing Hub',
    },
    {
      id: '4',
      type: 'pr_created' as const,
      title: 'Pull request created #123',
      timestamp: '3 hours ago',
      website: 'Tech Blog',
    },
    {
      id: '5',
      type: 'error' as const,
      title: 'Failed to generate draft',
      timestamp: '5 hours ago',
      website: 'Marketing Hub',
    },
  ];

  return (
    <div className="p-6 max-w-md">
      <ActivityFeed activities={activities} />
    </div>
  );
}
