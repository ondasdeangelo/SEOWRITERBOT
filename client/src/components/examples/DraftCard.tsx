import DraftCard from '../DraftCard';

export default function DraftCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2 p-6">
      <DraftCard
        title="The Future of AI in Web Development"
        excerpt="Artificial intelligence is revolutionizing how we build and maintain websites. From automated testing to intelligent code completion, AI tools are becoming indispensable..."
        wordCount={1543}
        readabilityScore={78}
        keywordDensity={2.3}
        status="draft"
        onView={() => console.log('View clicked')}
        onEdit={() => console.log('Edit clicked')}
        onPushToGitHub={() => console.log('Push to GitHub clicked')}
        onDownload={() => console.log('Download clicked')}
      />
      <DraftCard
        title="10 SEO Strategies That Actually Work in 2024"
        excerpt="Search engine optimization continues to evolve. Here are the most effective strategies that will help your content rank higher and attract more organic traffic..."
        wordCount={2156}
        readabilityScore={85}
        keywordDensity={3.1}
        status="pr_created"
        prUrl="https://github.com/user/repo/pull/123"
        onView={() => console.log('View clicked')}
        onEdit={() => console.log('Edit clicked')}
        onDownload={() => console.log('Download clicked')}
      />
    </div>
  );
}
