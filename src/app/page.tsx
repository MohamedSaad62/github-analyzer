"use client";
import { useState, useEffect } from "react";

type GitHubUser = {
  avatar_url: string;
  html_url: string;
  login: string;
  name: string;
  bio: string;
  followers: number;
  public_repos: number;
};

type GitHubRepo = {
  name: string;
  html_url: string;
  description: string;
  language: string;
  stargazers_count: number;
  readme?: string;
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [compareUsername, setCompareUsername] = useState("");
  const [userData, setUserData] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [compareAnalysis, setCompareAnalysis] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [comparing, setComparing] = useState(false);

  const [notes, setNotes] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // Load notes on mount
  useEffect(() => {
    async function loadNotes() {
      try {
        const res = await fetch("/api/notes");
        const data = await res.json();
        if (Array.isArray(data.notes)) {
          setNotes(data.notes);
        }
      } catch (err) {
        console.error("Failed to load notes:", err);
      }
    }
    loadNotes();
  }, []);

  const openNoteEditor = () => {
    setCurrentNote("");
    setShowNoteEditor(true);
  };

  const saveCurrentNote = async () => {
    if (currentNote.trim() === "") return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: currentNote }),
      });

      if (res.ok) {
        setNotes((prev) => [...prev, currentNote.trim()]);
        setCurrentNote("");
        setShowNoteEditor(false);
      } else {
        console.error("Failed to save note.");
      }
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  // 🔹 Fetch user + repos from your backend
  const fetchUser = async () => {
    setError("");
    setUserData(null);
    setRepos([]);
    setAnalysis("");
    setCompareAnalysis("");

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch user");
        return;
      }

      setUserData(data.user);
      setRepos(data.repos || []);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user");
    }
  };

  // 🔹 Analyze
 const analyzeActivity = async () => {
  if (!username.trim()) {
    setError("Please enter a username");
    return;
  }

  setAnalyzing(true);
  setError("");
  setAnalysis("");
  setCompareAnalysis("");

  try {
    // 🔹 Step 1: Fetch GitHub user data + repos
    const userRes = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    const userData = await userRes.json();

    if (!userRes.ok) {
      setError(userData.error || "Failed to fetch user data");
      setAnalyzing(false);
      return;
    }

    // 🔹 Step 2: Analyze using that data
    const analyzeRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        repos: userData.repos,
      }),
    });

    const analysisData = await analyzeRes.json();

    if (!analyzeRes.ok) {
      setError(analysisData.error || "Failed to analyze user");
    } else {
      setAnalysis(analysisData.summary || "No analysis available");
    }
  } catch (err) {
    console.error("Analyze error:", err);
    setError("Unexpected error during analysis");
  }

  setAnalyzing(false);
};


  // 🔹 Compare
const compareUsers = async () => {
  if (!username.trim() || !compareUsername.trim()) {
    setError("Please enter both usernames");
    return;
  }

  setComparing(true);
  setError("");
  setAnalysis("");
  setCompareAnalysis("");

  try {
    // 🔹 Step 1: Fetch user + repos for both usernames
    const [user1Res, user2Res] = await Promise.all([
      fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      }),
      fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: compareUsername.trim() }),
      }),
    ]);

    const user1Data = await user1Res.json();
    const user2Data = await user2Res.json();

    if (!user1Res.ok || !user2Res.ok) {
      setError(user1Data.error || user2Data.error || "Failed to fetch user data");
      setComparing(false);
      return;
    }

    // 🔹 Step 2: Analyze both users one by one (separate requests)
    const [analyze1Res, analyze2Res] = await Promise.all([
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          repos: user1Data.repos,
        }),
      }),
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: compareUsername.trim(),
          repos: user2Data.repos,
        }),
      }),
    ]);

    const analyze1Data = await analyze1Res.json();
    const analyze2Data = await analyze2Res.json();

    if (!analyze1Res.ok || !analyze2Res.ok) {
      setError(analyze1Data.error || analyze2Data.error || "Comparison failed");
    } else {
      setAnalysis(analyze1Data.summary || "No summary available");
      setCompareAnalysis(analyze2Data.summary || "No summary available");
    }
  } catch (err) {
    console.error("Comparison error:", err);
    setError("Failed to compare users");
  }

  setComparing(false);
};


  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20, fontFamily: "Arial" }}>
      <h1>GitHub Analyzer</h1>

      {/* Username Input */}
      <input
        type="text"
        placeholder="Enter GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ padding: 8, width: "100%", marginBottom: 10 }}
      />

      {/* Compare With Input */}
      <input
        type="text"
        placeholder="Compare with (optional)"
        value={compareUsername}
        onChange={(e) => setCompareUsername(e.target.value)}
        style={{ padding: 8, width: "100%", marginBottom: 10 }}
      />

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={fetchUser} style={{ flex: 1, padding: 10 }}>
          View Info
        </button>
        <button onClick={analyzeActivity} disabled={analyzing} style={{ flex: 1, padding: 10 }}>
          {analyzing ? "Analyzing..." : "🔍 Analyze"}
        </button>
        <button onClick={compareUsers} disabled={comparing} style={{ flex: 1, padding: 10 }}>
          {comparing ? "Comparing..." : "⚖️ Compare Users"}
        </button>
      </div>

      {/* Error */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Analysis */}
      {(analysis || compareAnalysis) && (
        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          <div style={{ flex: 1, background: "#f9f9f9", padding: 15, borderRadius: 6, whiteSpace: "pre-wrap" }}>
            <h3>{username}</h3>
            <p>{analysis}</p>
          </div>
          {compareAnalysis && (
            <>
              <div style={{ width: 2, background: "#ccc" }}></div>
              <div
                style={{
                  flex: 1,
                  background: "#f0f4ff",
                  padding: 15,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                <h3>{compareUsername}</h3>
                <p>{compareAnalysis}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* User Info + Repos */}
      {userData && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={userData.avatar_url} alt="avatar" style={{ width: 100, borderRadius: "50%" }} />
            <div>
              <h2>
                {userData.name} ({userData.login})
              </h2>
              <p>{userData.bio}</p>
              <p>👥 {userData.followers} followers</p>
              <p>📁 {userData.public_repos} public repositories</p>
              <p>
                🔗{" "}
                <a href={userData.html_url} target="_blank" rel="noreferrer">
                  View GitHub Profile
                </a>
              </p>
            </div>
          </div>

          <hr style={{ margin: "30px 0" }} />

          <h3>Public Repositories</h3>
          {repos.length === 0 ? (
            <p>No repositories found.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {repos.map((repo) => (
                <li
                  key={repo.name}
                  style={{ marginBottom: 20, padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
                >
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 18, fontWeight: "bold", color: "#0366d6" }}
                  >
                    {repo.name}
                  </a>
                  <p>{repo.description || "No description"}</p>
                  <p>📝 Language: {repo.language || "N/A"}</p>
                  <p>⭐ Stars: {repo.stargazers_count}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
