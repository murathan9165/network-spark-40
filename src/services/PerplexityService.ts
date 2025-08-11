export interface ProfileInsights {
  education: string[];
  skills: string[];
  projects: string[];
  interests: string[];
  summaryText: string;
}

export interface CommonPoints {
  schools: string[];
  skills: string[];
  interests: string[];
}

export interface GeneratedComms {
  email: string;
  talkingPoints: string[];
}

export class PerplexityService {
  static KEY_STORAGE = 'perplexity_api_key';

  static saveKey(key: string) {
    localStorage.setItem(this.KEY_STORAGE, key);
  }
  static getKey() {
    return localStorage.getItem(this.KEY_STORAGE);
  }

  static async generateEmailAndTalkingPoints(
    prompt: string
  ): Promise<GeneratedComms | null> {
    try {
      const response = await fetch('/functions/v1/perplexity-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        console.error('Perplexity edge error', await response.text());
        return null;
      }

      const data = await response.json();
      const text = (data?.content as string) || '';
      if (!text) return null;

      const parts = text.split('\n\n');
      const email = parts[0] || text;
      const talkingPoints = parts.slice(1, 4).filter(Boolean);
      return { email, talkingPoints };
    } catch (error) {
      console.error('Perplexity edge error', error);
      return null;
    }
  }
}

export function fallbackEmail(studentName: string, targetName: string, common: CommonPoints, targetSummary: string) {
  const opener = common.schools.length
    ? `Noticed we both spent time at ${common.schools[0]}—would love to swap notes on that experience.`
    : common.skills.length
      ? `I noticed we share interest in ${common.skills.slice(0,2).join(', ')} and would value your perspective.`
      : `I enjoyed reading about your work—especially the projects highlighted in your profile.`;

  return (
`Subject: Quick 15–20 min chat about ${common.skills[0] || 'your work'}

Hi ${targetName || 'there'},

I'm ${studentName || 'a student'}, and I'm exploring ${common.skills[0] || 'your field'}. ${opener}

From your background, I gathered: ${targetSummary.slice(0,180)}...

Would you be open to a brief 15–20 minute call next week? I'd also love to connect on LinkedIn.

Either way, thanks for your time—appreciate any advice you can share.

Best,
${studentName || 'A student'}`
  );
}

export function fallbackTalkingPoints(common: CommonPoints): string[] {
  const points: string[] = [];
  if (common.schools[0]) points.push(`Their path at ${common.schools[0]} and courses/majors that proved most useful.`);
  if (common.skills[0]) points.push(`Lessons from projects involving ${common.skills[0]} and how to get started.`);
  points.push('Advice for students breaking into the field and common early mistakes.');
  return points;
}
