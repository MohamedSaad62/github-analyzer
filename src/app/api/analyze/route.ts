import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN as string;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

export async function POST(req: NextRequest) {
  try {
    const { username, repos } = await req.json();
    console.log('API /api/analyze body:', { username, repoCount: repos.length });

    const totalRepos = repos.length;
    const languagesUsed: Record<string, number> = {};

    repos.forEach((repo: any) => {
      const lang = repo.language || 'Unknown';
      languagesUsed[lang] = (languagesUsed[lang] || 0) + 1;
    });

    // --- Commit summary with safe error handling ---
    const commitSummaries = await Promise.all(
      repos.map(async (repo: any) => {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=50`,
            {
              headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );

          if (!res.ok) {
            console.warn(`Failed commits fetch ${repo.name}: ${res.status}`);
            return { repoName: repo.name, commitCount: 0 };
          }

          const commits = await res.json();
          return Array.isArray(commits)
            ? { repoName: repo.name, commitCount: commits.length }
            : { repoName: repo.name, commitCount: 0 };
        } catch (e) {
          console.error(`Commit fetch error ${repo.name}:`, e);
          return { repoName: repo.name, commitCount: 0 };
        }
      })
    );

    const readmeSummaries = repos
      .map((r: any) =>
        r.readme
          ? `Repo "${r.name}" README excerpt:\n${r.readme.slice(0, 500)}`
          : `Repo "${r.name}" has no README available.`
      )
      .join('\n\n');

    const languageSummary = Object.entries(languagesUsed)
      .map(([lang, count]) => `- ${lang}: ${count} repo(s)`)
      .join('\n');

    const commitSummary = commitSummaries
      .map((c) => `- ${c.repoName}: ${c.commitCount} commits`)
      .join('\n');

    const promptText = `
User **${username}** has **${totalRepos} public repositories**.

Languages used:
${languageSummary}

Commit activity:
${commitSummary}

README excerpts:
${readmeSummaries}

 summarize and analysis where you do the following points:
 1. output after every point should exist end line
 2. number of repositories in a single point
 3. programming Languages used in another single point 
 4. frequncy of commits and how much use is active in another single point
 5.show trends in another single point in no more than 100 words
 6. make general analysis and summary in more than 200 words
`;

    // --- Gemini API call with safe checks ---
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
    console.log("Gemini raw response:", geminiData);

    const summary =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No summary returned';

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
