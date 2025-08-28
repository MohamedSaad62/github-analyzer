import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "Missing GitHub token" }, { status: 500 });
  }

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos`, { headers }),
    ]);

    if (!userRes.ok) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await userRes.json();
    let repos = await reposRes.json();

    // limit repos to 5 to avoid API overload
    repos = repos.slice(0, 5);

    // fetch README for each repo
    const reposWithReadme = await Promise.all(
      repos.map(async (repo: any) => {
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/${username}/${repo.name}/readme`,
            { headers }
          );
          if (readmeRes.ok) {
            const readmeData = await readmeRes.json();
            const content = Buffer.from(readmeData.content, "base64").toString("utf-8");
            return { ...repo, readme: content };
          }
        } catch {
          // ignore if no readme
        }
        return { ...repo, readme: "" };
      })
    );

    return NextResponse.json({ user, repos: reposWithReadme });
  } catch (err) {
    console.error("GitHub API error:", err);
    return NextResponse.json({ error: "GitHub fetch failed" }, { status: 500 });
  }
}
