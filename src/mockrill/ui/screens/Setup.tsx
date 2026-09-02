import React, { useEffect, useState } from "react";
import { setTheme, currentTheme } from "src/platform/ui/index.js";
import type { ThemeId } from "src/platform/ui/index.js";
import qb from "engine/rag/question-bank.json" with { type: "json" };

export function Setup(props: { onStart: (role: string) => void; onHistory?: () => void }) {
  const roles = Object.keys((qb as { roles: Record<string, unknown> }).roles);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState<boolean>(true);
  const [theme, setThemeState] = useState<ThemeId>(currentTheme());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setTtsAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const handleMicTest = async () => {
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicOk(true);
    } catch {
      setMicOk(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h1>Setup</h1>
      <label htmlFor="role-select">Role</label>
      <select id="role-select" value={selectedRole ?? ""} onChange={(e) => setSelectedRole(e.target.value || null)}>
        <option value="">Select a role</option>
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <button onClick={handleMicTest} disabled={testing}>
        Test microphone
      </button>
      {micOk === true && <span>Microphone ready</span>}
      {micOk === false && <span>Microphone unavailable</span>}

      {!ttsAvailable && <div role="alert">Voice output unavailable — questions will appear as text</div>}

      <label htmlFor="theme-select">Theme</label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => {
          const v = e.target.value as ThemeId;
          setTheme(v);
          setThemeState(v);
        }}
      >
        <option value="minimal">minimal</option>
        <option value="editorial">editorial</option>
        <option value="operator">operator</option>
      </select>

      <button onClick={() => props.onStart(selectedRole!)} disabled={!selectedRole}>
        Start screening call
      </button>
      {props.onHistory && <button onClick={props.onHistory}>History</button>}
    </div>
  );
}
