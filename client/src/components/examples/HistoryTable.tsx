import HistoryTable from '../HistoryTable';

export default function HistoryTableExample() {
  const entries = [
    {
      id: '1',
      timestamp: '2024-01-15 14:30',
      website: 'Tech Blog',
      action: 'Draft Created',
      articleTitle: 'The Future of AI in Web Development',
      status: 'success' as const,
      prUrl: 'https://github.com/user/repo/pull/123',
    },
    {
      id: '2',
      timestamp: '2024-01-15 12:15',
      website: 'Marketing Hub',
      action: 'Article Generated',
      articleTitle: '10 SEO Strategies That Actually Work',
      status: 'success' as const,
    },
    {
      id: '3',
      timestamp: '2024-01-15 10:00',
      website: 'Tech Blog',
      action: 'Ideas Generated',
      articleTitle: 'Understanding Machine Learning Basics',
      status: 'pending' as const,
    },
    {
      id: '4',
      timestamp: '2024-01-14 16:45',
      website: 'Marketing Hub',
      action: 'Draft Created',
      articleTitle: 'Content Marketing Trends 2024',
      status: 'failed' as const,
    },
  ];

  return (
    <div className="p-6">
      <HistoryTable entries={entries} />
    </div>
  );
}
