import { useEffect, useState } from "react";
import { ExternalLink, GitCommitHorizontal, RefreshCw } from "lucide-react";

type PublicEvent = {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
};
type ActivityState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; events: PublicEvent[] };
const EVENT_LABELS: Record<string, string> = {
  PushEvent: "Pushed code",
  CreateEvent: "Created a branch or repository",
  PullRequestEvent: "Updated a pull request",
  IssuesEvent: "Updated an issue",
  IssueCommentEvent: "Commented on an issue",
  ReleaseEvent: "Updated a release",
  ForkEvent: "Forked a repository",
  DeleteEvent: "Deleted a branch or tag",
};
export function PublicActivity() {
  const [state, setState] = useState<ActivityState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let active = true;
    fetch("https://api.github.com/users/Leovoss/events/public?per_page=100", {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("GitHub unavailable");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid response");
        const events = data
          .filter(
            (item): item is PublicEvent =>
              typeof item?.id === "string" &&
              typeof item?.type === "string" &&
              item.type !== "WatchEvent" &&
              typeof item?.repo?.name === "string" &&
              typeof item?.created_at === "string" &&
              Number.isFinite(Date.parse(item.created_at)),
          )
          .slice(0, 3);
        if (active) setState({ status: "ready", events });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  if (state.status === "loading")
    return (
      <p className="activity-message" role="status">
        Loading public GitHub activity…
      </p>
    );
  if (state.status === "error")
    return (
      <div className="activity-message" role="status">
        <h2>Activity couldn’t be loaded.</h2>
        <p>
          GitHub may be unavailable or limiting requests. You can retry or open
          the public profile below.
        </p>
        <button
          className="secondary-button"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt(attempt + 1);
          }}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  if (!state.events.length)
    return (
      <p className="activity-message" role="status">
        There are no recent public events to show. You can still explore the
        public repositories on GitHub.
      </p>
    );
  return (
    <ul className="activity-list">
      {state.events.map((event) => (
        <li key={event.id}>
          <GitCommitHorizontal size={21} aria-hidden="true" />
          <div>
            <p>{EVENT_LABELS[event.type] ?? "Public activity"}</p>
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {event.repo.name}
              <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <time dateTime={event.created_at}>
            {new Date(event.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </time>
        </li>
      ))}
    </ul>
  );
}
