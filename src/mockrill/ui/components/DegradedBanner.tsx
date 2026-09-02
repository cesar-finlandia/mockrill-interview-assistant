import React from "react";

export function DegradedBanner(props: { reason: string | null }) {
  return (
    <div role="alert" style={{ background: "#f59e0b", color: "black", padding: "8px" }}>
      Running on cached session data{props.reason ? `: ${props.reason}` : ""}
    </div>
  );
}
