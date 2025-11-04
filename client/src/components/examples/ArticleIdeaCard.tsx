import ArticleIdeaCard from '../ArticleIdeaCard';

export default function ArticleIdeaCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2 p-6">
      <ArticleIdeaCard
        headline="The Future of AI in Web Development: What Developers Need to Know"
        confidence={87}
        keywords={["AI", "Web Development", "Future Tech", "Developers"]}
        estimatedWords={1500}
        seoScore={85}
        status="pending"
        onApprove={() => console.log('Approved')}
        onReject={() => console.log('Rejected')}
        onEdit={() => console.log('Edit clicked')}
      />
      <ArticleIdeaCard
        headline="10 SEO Strategies That Actually Work in 2024"
        confidence={92}
        keywords={["SEO", "Marketing", "2024", "Strategy"]}
        estimatedWords={2000}
        seoScore={92}
        status="approved"
        priority={1}
        scheduledDate="Tomorrow, 9:00 AM"
      />
    </div>
  );
}
