// Browser stand-in for node:fs.
//
// The chassis transport validates every envelope against contracts/event-envelope.schema.json
// and reads config/transport.json, both with readFileSync(new URL(...)). On a server that is
// correct; in the browser there is no disk, and the chassis is read-only so the read cannot
// move. These two files are static build inputs, so they are bundled here and served by
// suffix match — the validation the chassis performs is preserved exactly, not skipped.
import envelopeSchema from "../../contracts/event-envelope.schema.json";
import transportConfig from "../../config/transport.json";

const BUNDLED = [
  ["contracts/event-envelope.schema.json", envelopeSchema],
  ["config/transport.json", transportConfig],
];

export function readFileSync(target) {
  const raw = target && target.href ? target.href : target;
  const key = String(raw).split("\\").join("/");
  // `vite build` rewrites new URL("...json", import.meta.url) into an inlined data: URI, so
  // in the production bundle the chassis asks for the schema by value rather than by path.
  if (key.startsWith("data:")) {
    const comma = key.indexOf(",");
    const meta = key.slice(0, comma);
    const payload = key.slice(comma + 1);
    return meta.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
  }
  for (const [suffix, value] of BUNDLED) {
    if (key.endsWith(suffix)) return JSON.stringify(value);
  }
  throw new Error(`node:fs readFileSync("${key}") is not available in the browser`);
}

export default { readFileSync };
