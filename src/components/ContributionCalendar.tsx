import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type Level = 0 | 1 | 2 | 3 | 4;
type Day = { date: string; count: number; level: Level };
type PushEvent = { type: string; repo?: { name: string }; payload?: { commits?: unknown[] } };
type TopRepo = { name: string; owner: string; count: number };

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function useTopRepos(username: string) {
  const [repos, setRepos] = useState<TopRepo[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`https://api.github.com/users/${username}/events/public?per_page=100`)
      .then((res) => (res.ok ? res.json() : null))
      .then((events: PushEvent[] | null) => {
        if (!active || !Array.isArray(events)) return;
        const counts = new Map<string, number>();
        for (const event of events) {
          if (event.type !== "PushEvent" || !event.repo) continue;
          const commits = event.payload?.commits?.length ?? 1;
          counts.set(event.repo.name, (counts.get(event.repo.name) ?? 0) + commits);
        }
        const top = [...counts.entries()]
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([fullName, count]) => {
            const [owner, name] = fullName.split("/");
            return { name, owner, count };
          });
        setRepos(top);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [username]);

  return repos;
}

export function ContributionCalendar({ username }: { username: string }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [open, setOpen] = useState(false);
  const repos = useTopRepos(username);

  useEffect(() => {
    let active = true;
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { contributions?: Day[] } | null) => {
        if (active && data?.contributions?.length) setDays(data.contributions);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [username]);

  if (!days) return null;

  const start = days.findIndex(
    (day) => new Date(`${day.date}T00:00:00Z`).getUTCDay() === 0,
  );
  const aligned = days.slice(start < 0 ? 0 : start);
  const weeks: Day[][] = [];
  for (let i = 0; i < aligned.length; i += 7) weeks.push(aligned.slice(i, i + 7));

  const monthLabels = weeks.map((week, index) => {
    const month = week[0]?.date.slice(5, 7);
    const prevMonth = weeks[index - 1]?.[0]?.date.slice(5, 7);
    return month && month !== prevMonth ? MONTH_NAMES[Number(month) - 1] : null;
  });

  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="contribution-calendar">
      <div className="contribution-calendar-months" aria-hidden="true">
        {monthLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div
        className="contribution-calendar-grid"
        role="img"
        aria-label={`${total} public contributions in the past year`}
      >
        {weeks.map((week, weekIndex) => (
          <div className="contribution-calendar-week" key={weekIndex}>
            {week.map((day) => (
              <div
                key={day.date}
                className={`contribution-calendar-day level-${day.level}`}
                title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
              />
            ))}
          </div>
        ))}
      </div>
      {repos.length > 0 && (
        <div className="contribution-top-repos">
          <button
            type="button"
            className="contribution-top-repos-toggle"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <span>Top contributions in:</span>
            <span className="contribution-top-repos-avatars">
              {repos.map((repo) => (
                <img
                  key={repo.name}
                  src={`https://github.com/${repo.owner}.png?size=64`}
                  alt=""
                  className="contribution-top-repo-avatar"
                />
              ))}
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`contribution-top-repos-chevron ${open ? "is-open" : ""}`}
            />
          </button>
          {open && (
            <ul className="contribution-top-repos-list">
              {repos.map((repo) => (
                <li key={repo.name}>
                  <a
                    href={`https://github.com/${repo.owner}/${repo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`https://github.com/${repo.owner}.png?size=64`}
                      alt=""
                      className="contribution-top-repo-avatar"
                    />
                    <span>{repo.name}</span>
                    <span className="contribution-top-repo-count">{repo.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
