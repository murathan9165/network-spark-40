import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { PerplexityService, fallbackEmail, fallbackTalkingPoints, ProfileInsights, CommonPoints } from '@/services/PerplexityService';

function cleanText(input: any): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function extractInsights(raw: string): ProfileInsights {
  const text = cleanText(raw).replace(/\s+\n/g, '\n');
  const lines = text.split(/\n|\\n/).map(l => l.trim());

  const section = (name: string) => {
    const start = lines.findIndex(l => new RegExp(`^${name}\\b`, 'i').test(l));
    if (start === -1) return [] as string[];
    const slice = lines.slice(start + 1, start + 40);
    return slice.filter(Boolean).slice(0, 12);
  };

  const edu = section('Education');
  const proj = section('Projects').concat(section('Publications'));
  const intr = section('Interests').concat(section('Volunteer'));

  const majors: string[] = [];
  edu.forEach(l => {
    const m = l.match(/(B\.?S\.?|M\.?S\.?|Bachelors|Masters|PhD|Major|Field|Degree)[:\-]?\s*(.*)/i);
    if (m && m[2]) majors.push(m[2]);
  });

  const skills: string[] = [];
  lines.forEach(l => {
    if (/skills|technologies|stack|expertise/i.test(l)) {
      const items = l.replace(/.*: /, '').split(/[•,|]/).map(s => s.trim()).filter(Boolean);
      skills.push(...items);
    }
  });

  return {
    education: majors.slice(0, 6),
    skills: Array.from(new Set(skills.map(s => s.toLowerCase()))).slice(0, 20),
    projects: proj.slice(0, 6),
    interests: intr.slice(0, 8),
    summaryText: lines.slice(0, 60).join(' '),
  };
}

function compareCommon(a: ProfileInsights, b: ProfileInsights): CommonPoints {
  const intersect = (arr1: string[], arr2: string[]) => {
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    return Array.from(new Set(arr1.filter(x => set2.has(x.toLowerCase()))));
  };
  const schools = intersect(a.education, b.education);
  const skills = intersect(a.skills, b.skills).slice(0, 6);
  const interests = intersect(a.interests, b.interests).slice(0, 6);
  return { schools, skills, interests };
}

export const LinkedInNetworkingAssistant = () => {
  const { toast } = useToast();
  const [studentUrl, setStudentUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState<string>(FirecrawlService.getApiKey() || '');
  const [pplxKey, setPplxKey] = useState<string>(PerplexityService.getKey() || '');

  const [studentRaw, setStudentRaw] = useState('');
  const [targetRaw, setTargetRaw] = useState('');
  const [studentInsights, setStudentInsights] = useState<ProfileInsights | null>(null);
  const [targetInsights, setTargetInsights] = useState<ProfileInsights | null>(null);
  const [common, setCommon] = useState<CommonPoints | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);

  const saveKeys = async () => {
    if (firecrawlKey) FirecrawlService.saveApiKey(firecrawlKey);
    if (pplxKey) PerplexityService.saveKey(pplxKey);
    toast({ title: 'Saved', description: 'API keys saved locally.' });
  };

  const scrape = async (url: string) => {
    const res = await FirecrawlService.crawlWebsite(url);
    if (!res.success) throw new Error(res.error || 'Scrape failed');
    const data: any = res.data;
    const payload = (data?.data && Array.isArray(data.data) ? data.data.map((d: any) => d.markdown || d.html).join('\n') : JSON.stringify(data));
    return payload;
  };

  const analyze = async () => {
    try {
      setLoading(true);
      setProgress(10);

      if (!firecrawlKey && (!studentRaw || !targetRaw)) {
        toast({
          title: 'Add Firecrawl key or paste profiles',
          description: 'LinkedIn may block scraping. Pasting profile text also works.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      let studentText = studentRaw;
      let targetText = targetRaw;

      if (studentUrl) {
        setProgress(25);
        try { studentText = await scrape(studentUrl); } catch (e) { console.warn(e); }
      }
      if (targetUrl) {
        setProgress(50);
        try { targetText = await scrape(targetUrl); } catch (e) { console.warn(e); }
      }

      if (!studentText || !targetText) {
        toast({ title: 'Missing data', description: 'Provide URLs or paste profile text for both.' , variant: 'destructive'});
        setLoading(false);
        return;
      }

      const s = extractInsights(studentText);
      const t = extractInsights(targetText);
      setStudentInsights(s);
      setTargetInsights(t);
      const c = compareCommon(s, t);
      setCommon(c);
      setProgress(75);

      const prompt = `Create: (1) a brief cold email for a student to request a 15–20 min call and LinkedIn connection, (2) three concise talking points. Base it on these details. Student skills: ${s.skills.join(', ')}; Student education: ${s.education.join(', ')}. Target education fields: ${t.education.join(', ')}. Target projects: ${t.projects.slice(0,3).join('; ')}. Common ground: schools: ${c.schools.join(', ')}, skills: ${c.skills.join(', ')}, interests: ${c.interests.join(', ')}. Keep it warm, specific, and under 170 words for the email.`;

      const ai = await PerplexityService.generateEmailAndTalkingPoints(prompt);
      const email = ai?.email || fallbackEmail('Student', 'Professional', c, t.summaryText);
      const tps = ai?.talkingPoints?.length ? ai.talkingPoints : fallbackTalkingPoints(c);
      setGeneratedEmail(email);
      setTalkingPoints(tps);

      setProgress(100);
      toast({ title: 'Analysis complete', description: 'Draft and insights ready.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Something went wrong during analysis.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="elevated">
        <CardHeader>
          <CardTitle>LinkedIn Networking Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="studentUrl" className="text-sm">Your LinkedIn URL</label>
              <Input id="studentUrl" placeholder="https://www.linkedin.com/in/you" value={studentUrl} onChange={e => setStudentUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="targetUrl" className="text-sm">Target LinkedIn URL</label>
              <Input id="targetUrl" placeholder="https://www.linkedin.com/in/target" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firecrawl" className="text-sm">Firecrawl API Key (temporary)</label>
              <Input id="firecrawl" placeholder="fc_live_..." value={firecrawlKey} onChange={e => setFirecrawlKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="pplx" className="text-sm">Perplexity API Key (optional)</label>
              <Input id="pplx" placeholder="pplx-..." value={pplxKey} onChange={e => setPplxKey(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="subtle" onClick={saveKeys}>Save API keys</Button>
            <Button variant="hero" onClick={analyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Profiles'}</Button>
          </div>

          {loading && <Progress value={progress} />}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm">Or paste your profile text</label>
              <Textarea rows={6} placeholder="Paste your public profile text if scraping is blocked" value={studentRaw} onChange={e => setStudentRaw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Or paste target profile text</label>
              <Textarea rows={6} placeholder="Paste target's public profile text if scraping is blocked" value={targetRaw} onChange={e => setTargetRaw(e.target.value)} />
            </div>
          </div>

          {common && targetInsights && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Common Ground</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div><strong>Schools</strong>: {common.schools.join(', ') || '—'}</div>
                  <div><strong>Skills</strong>: {common.skills.join(', ') || '—'}</div>
                  <div><strong>Interests</strong>: {common.interests.join(', ') || '—'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Education (Target)</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    {targetInsights.education.length ? targetInsights.education.map((e, i) => (<li key={i}>{e}</li>)) : <li>—</li>}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {targetInsights && (
            <Card>
              <CardHeader><CardTitle>Target Summary</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-6 opacity-90">{targetInsights.summaryText.slice(0, 550)}</p>
                {targetInsights.projects.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Notable Projects</div>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {targetInsights.projects.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {generatedEmail && (
            <Card className="bg-card/60">
              <CardHeader><CardTitle>Cold Email Draft</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={generatedEmail} onChange={() => {}} rows={10} className="w-full" />
              </CardContent>
            </Card>
          )}

          {talkingPoints.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Talking Points (3)</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  {talkingPoints.slice(0,3).map((t, i) => <li key={i}>{t}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
