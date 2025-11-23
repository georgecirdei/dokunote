export default function MarketingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center spacing-compact-lg">
        <h1 className="heading-compact font-bold text-foreground">
          Welcome to DokuNote
        </h1>
        <p className="prose-compact text-muted-foreground max-w-2xl mx-auto">
          Enterprise-grade multi-tenant documentation platform built with Next.js 15, React 19, and TypeScript.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Get Started
          </button>
          <button className="px-6 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
