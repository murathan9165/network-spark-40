import { Button } from "@/components/ui/button";
import { LinkedInNetworkingAssistant } from "@/components/LinkedInNetworkingAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto py-12 text-center">
        <h1 className="text-5xl font-semibold tracking-tight mb-4">Student Networking Assistant</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Paste LinkedIn URLs or profile text. We’ll find common ground, summarize their path, and draft a warm outreach email and talking points.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="hero">Get Started</Button>
          <Button variant="outline" asChild>
            <a href="#tool">Learn more</a>
          </Button>
        </div>
      </header>
      <main id="tool" className="container pb-20">
        <LinkedInNetworkingAssistant />
      </main>
    </div>
  );
};

export default Index;
