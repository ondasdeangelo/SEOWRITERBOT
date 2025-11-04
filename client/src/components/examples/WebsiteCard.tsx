import WebsiteCard from '../WebsiteCard';

export default function WebsiteCardExample() {
  return (
    <div className="space-y-4 p-6">
      <WebsiteCard
        name="Tech Blog"
        url="https://techblog.example.com"
        keywords={["AI", "Machine Learning", "Web Development"]}
        status="active"
        lastGenerated="2 hours ago"
        totalArticles={24}
        nextScheduled="Tomorrow, 9:00 AM"
        onConfigure={() => console.log('Configure clicked')}
        onGenerate={() => console.log('Generate clicked')}
        onDelete={() => console.log('Delete clicked')}
      />
      <WebsiteCard
        name="Marketing Hub"
        url="https://marketing.example.com"
        keywords={["SEO", "Content Marketing", "Digital Strategy"]}
        status="paused"
        lastGenerated="3 days ago"
        totalArticles={15}
        nextScheduled="Paused"
        onConfigure={() => console.log('Configure clicked')}
        onGenerate={() => console.log('Generate clicked')}
        onDelete={() => console.log('Delete clicked')}
      />
    </div>
  );
}
