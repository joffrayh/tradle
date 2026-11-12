import { csv } from "d3-fetch";
import { useEffect, useMemo, useState } from "react";
import { countriesWithImage, Country } from "../domain/countries";

interface DateCountry {
  country: string;
  date: string;
}

// The daily schedule is the official Tradle one (date -> country). The deploy
// workflow refreshes public/data.new.csv from prod.oec.world before each build,
// because that server doesn't allow cross-origin requests from the browser.
let schedulePromise: Promise<DateCountry[]> | null = null;
function loadSchedule(): Promise<DateCountry[]> {
  if (schedulePromise == null) {
    schedulePromise = csv(`${process.env.PUBLIC_URL}/data.new.csv`, (d) => ({
      country: (d.country ?? "").toUpperCase(),
      date: d.date ?? "",
    })).catch((error) => {
      schedulePromise = null; // allow a retry on the next mount
      throw error;
    });
  }
  return schedulePromise;
}

/** `undefined` while loading, then the full schedule (empty on error). */
export function useSchedule(): DateCountry[] | undefined {
  const [schedule, setSchedule] = useState<DateCountry[]>();
  useEffect(() => {
    let cancelled = false;
    loadSchedule()
      .then((rows) => !cancelled && setSchedule(rows))
      .catch(() => !cancelled && setSchedule([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return schedule;
}

function findCountry(code: string): Country | undefined {
  return countriesWithImage.find((country) => country.code === code);
}

/**
 * The country for a given day. `loading` is true until the schedule is known;
 * after that `country` is undefined only if nothing is scheduled for that day.
 */
export function useCountry(dayString: string): {
  country: Country | undefined;
  loading: boolean;
} {
  const schedule = useSchedule();
  return useMemo(() => {
    if (schedule == null) return { country: undefined, loading: true };
    const entry = schedule.find((row) => row.date === dayString);
    return {
      country: entry ? findCountry(entry.country) : undefined,
      loading: false,
    };
  }, [schedule, dayString]);
}

/** Every country that has ever been a daily puzzle (all have trade data). */
export function useCountryPool(): Country[] {
  const schedule = useSchedule();
  return useMemo(() => {
    if (schedule == null) return [];
    const codes = new Set(schedule.map((row) => row.country));
    return countriesWithImage.filter((country) => codes.has(country.code));
  }, [schedule]);
}
