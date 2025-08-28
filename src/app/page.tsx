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
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to analyze");
      } else {
        setAnalysis(data.summary || "No analysis available");
      }
    } catch (err) {
      setError("Failed to analyze");
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
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username1: username.trim(),
          username2: compareUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Comparison failed");
      } else {
        setAnalysis(data.summary1 || "No summary available");
        setCompareAnalysis(data.summary2 || "No summary available");
      }
    } catch (err) {
      setError("Failed to compare");
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

      {/* Floating Notes */}
      <button
        onClick={openNoteEditor}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          padding: "12px 16px",
          fontSize: 16,
          borderRadius: 8,
          backgroundColor: "#0366d6",
          color: "white",
          border: "none",
          cursor: "pointer",
          zIndex: 1000,
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        }}
      >
        📝 Add Note
      </button>

      {/* Note Editor */}
      {showNoteEditor && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 20,
            width: 320,
            backgroundColor: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: 8,
            padding: 16,
            zIndex: 999,
          }}
        >
          <textarea
            rows={5}
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            placeholder="Write your note..."
            style={{ width: "100%", padding: 8, fontSize: 14 }}
          />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={saveCurrentNote} style={{ padding: "6px 12px" }}>
              Save
            </button>
            <button onClick={() => setShowNoteEditor(false)} style={{ padding: "6px 12px" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved Notes */}
      {notes.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: showNoteEditor ? 200 : 100,
            right: 20,
            width: 320,
            maxHeight: "50vh",
            overflowY: "auto",
            backgroundColor: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: 8,
            padding: 16,
            zIndex: 998,
          }}
        >
          <h3 style={{ marginBottom: 10 }}>🗂 Saved Notes</h3>
          <ul style={{ paddingLeft: 20 }}>
            {notes.map((note, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 8,
                  backgroundColor: "#f9f9f9",
                  padding: 8,
                  borderRadius: 4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
