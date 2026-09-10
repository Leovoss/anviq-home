import { useEffect, useState } from "react";

export function useContributionsTotal() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/contributions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (active && typeof data?.count === "number") setTotal(data.count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return total;
}
