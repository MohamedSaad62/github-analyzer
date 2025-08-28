"use client";

import { useState } from "react";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Fetch GitHub user + repos
  const fetchUser = async () => {
    setError(null);
    setUserData(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Please enter a username");
      return;
    }

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setError(error || "User not found");
        return;
      }

      const data = await res.json();
      setUserData(data);
    } catch (err) {
      setError("Failed to fetch user");
    }
  };

  // 🔹 Analyze GitHub activity
  const analyzeActivity = async () => {
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      alert("Analysis result: " + JSON.stringify(data));
    } catch (err) {
      setError("Failed to analyze");
    }
  };

  // 🔹 Compare with another GitHub user
  const compareUsers = async () => {
    const other = prompt("Enter another GitHub username:");
    if (!other) return;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username1: username.trim(),
          username2: other.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Comparison failed");
        return;
      }

      alert("Comparison result: " + JSON.stringify(data));
    } catch (err) {
      setError("Failed to compare");
    }
  };

  // 🔹 Save note
  const saveNote = async () => {
    const note = prompt("Enter a note:");
    if (!note) return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError("Failed to save note");
        return;
      }

      alert("Note saved!");
    } catch (err) {
      setError("Failed to save note");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>GitHub Analyzer</h1>
      <input
        type="text"
        placeholder="Enter GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ marginRight: "1rem" }}
      />
      <button onClick={fetchUser}>Fetch User</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {userData && (
        <div style={{ marginTop: "2rem" }}>
          <h2>{userData.user.login}</h2>
          <img src={userData.user.avatar_url} width={100} alt="avatar" />
          <p>{userData.user.bio}</p>

          <h3>Repos:</h3>
          <ul>
            {userData.repos.map((repo: any) => (
              <li key={repo.id}>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  {repo.name}
                </a>
              </li>
            ))}
          </ul>

          <button onClick={analyzeActivity}>Analyze Activity</button>
          <button onClick={compareUsers}>Compare Users</button>
          <button onClick={saveNote}>Save Note</button>
        </div>
      )}
    </div>
  );
}
