import { csv } from "d3-fetch";
import { useEffect, useMemo, useState } from "react";
import {
  countriesWithImage,
  Country,
  getOecCountryId,
} from "../domain/countries";

interface DateCountry {
  country: string;
  date: string;
}

// The daily schedule (date -> country) is tradle.net's. The deploy workflow
// refreshes public/data.new.csv from tradle.net before each build, because that
// server doesn't allow cross-origin requests from the browser.
let schedulePromise: Promise<DateCountry[]> | null = null;
function loadSchedule(): Promise<DateCountry[]> {
  if (schedulePromise == null) {
    // "no-cache" makes the browser revalidate with the server every time.
    // Without it a phone could reuse a schedule cached from an earlier deploy
    // and show the wrong country until the page was refreshed.
    schedulePromise = csv(
      `${process.env.PUBLIC_URL}/data.new.csv`,
      { cache: "no-cache" },
      (d) => ({
        country: (d.country ?? "").toUpperCase(),
        date: d.date ?? "",
      })
    ).catch((error) => {
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
  /** Whether the schedule has an entry for this day at all. */
  scheduled: boolean;
} {
  const schedule = useSchedule();
  return useMemo(() => {
    if (schedule == null) {
      return { country: undefined, loading: true, scheduled: false };
    }
    const entry = schedule.find((row) => row.date === dayString);
    return {
      country: entry ? findCountry(entry.country) : undefined,
      loading: false,
      scheduled: entry != null,
    };
  }, [schedule, dayString]);
}

/** Every country that has been a daily puzzle and has OEC trade data. */
export function useCountryPool(): Country[] {
  const schedule = useSchedule();
  return useMemo(() => {
    if (schedule == null) return [];
    const codes = new Set(schedule.map((row) => row.country));
    return countriesWithImage.filter(
      (country) => codes.has(country.code) && getOecCountryId(country) != null
    );
  }, [schedule]);
}
