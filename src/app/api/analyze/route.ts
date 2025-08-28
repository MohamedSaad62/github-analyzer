import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


export async function POST(req: NextRequest) {
  try {
    const { username, repos } = await req.json();
    console.log('API /api/analyze body:', { username, repoCount: repos.length });

    // Language usage summary
    const totalRepos = repos.length;
    const languagesUsed: Record<string, number> = {};

    repos.forEach((repo: any) => {
      const lang = repo.language || 'Unknown';
      languagesUsed[lang] = (languagesUsed[lang] || 0) + 1;
    });

    const reposToAnalyze = repos;

    // Fetch commits and prepare commit summaries
    const commitSummaries = await Promise.all(
      reposToAnalyze.map(async (repo: any) => {
        const { name, owner } = repo;

        const res = await fetch(
          `https://api.github.com/repos/${owner.login}/${name}/commits?per_page=100`,
          {
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!res.ok) {
          console.warn(`Failed to fetch commits for ${name}: ${res.status}`);
          return { repoName: name, commitCount: 0 };
        }

        const commits = await res.json();
        return { repoName: name, commitCount: commits.length };
      })
    );

    // Prepare README excerpts (first 500 chars)
    const readmeSummaries = reposToAnalyze
      .map((r: any) => {
        if (r.readme && r.readme.length > 0) {
          const snippet = r.readme.length > 500 ? r.readme.slice(0, 500) + '...' : r.readme;
          return `Repo "${r.name}" README excerpt:\n${snippet}`;
        } else {
          return `Repo "${r.name}" has no README available.`;
        }
      })
      .join('\n\n');

    const languageSummary = Object.entries(languagesUsed)
      .map(([lang, count]) => `- ${lang}: ${count} repo(s)`)
      .join('\n');

    const commitSummary = commitSummaries
      .map((c) => `- ${c.repoName}: ${c.commitCount} commits`)
      .join('\n');

    const promptText = `
You are an AI that analyzes GitHub user activity.

User **${username}** has **${totalRepos} public repositories**.

Note: Commit data and README excerpts below are only for the first 5 repositories to avoid API rate limits.

Here is a summary of programming languages used:
${languageSummary}

Here is the commit activity per repository:
${commitSummary}

Here are README excerpts from the analyzed repositories:
${readmeSummaries}

Please provide a summary where:
1. you should have output format where after every point an endline 
2. you view the number of repos as a single point
3. you view the used programming languages as another single point
4. you view commit activity and frequency
5. view the trends of a user in no more than 100 words in another single point
6. add some summary you see in no longer than 200 words
7. answer with desired points only without anything else
`;

    // Gemini API call
    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('Gemini API error:', err);
      return NextResponse.json({ error: 'Gemini API failed' }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const summary =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary returned';

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
