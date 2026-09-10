import { useEffect, useState } from "react";

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
export type ContributionRepo = {
  name: string;
  owner: string;
  isPrivate: boolean;
  count: number;
};
type ContributionsResponse = {
  count: number;
  days: ContributionDay[];
  repos: ContributionRepo[];
};

export function useContributions() {
  const [data, setData] = useState<ContributionsResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/contributions")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: Partial<ContributionsResponse> | null) => {
        if (active && typeof json?.count === "number" && Array.isArray(json.days)) {
          setData({
            count: json.count,
            days: json.days,
            repos: Array.isArray(json.repos) ? json.repos : [],
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return data;
}
