import { DateTime } from "luxon";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import {
  getCountryName,
  countryISOMapping,
  getFictionalCountryByName,
  getCountryByName,
  getOecCountryId,
} from "../domain/countries";
import { getCompassDirection } from "../domain/geography";
import { useGuesses } from "../hooks/useGuesses";
import { CountryInput } from "./CountryInput";
import * as geolib from "geolib";
import { Share } from "./Share";
import { Guesses } from "./Guesses";
import { useTranslation } from "react-i18next";
import { SettingsData } from "../hooks/useSettings";
import { useMode } from "../hooks/useMode";
import { useCountry, useCountryPool } from "../hooks/useCountry";
import { useUnlimitedGame } from "../hooks/useUnlimitedGame";
import { Treemap } from "./Treemap";
import { useOECSession, type OECSession } from "../hooks/useOECSession";
// import { BotMarketLink } from "./BotMarketLink";
import { OecLink } from "./OecLink";
import {
  APRIL_FOOLS_CELEBRATION,
  APRIL_FOOLS_PLACEHOLDER,
  APRIL_FOOLS_PROMPT,
  APRIL_FOOLS_TARGET,
  getAprilFoolsHint,
} from "../domain/aprilFools";

function getDayString() {
  // Parse query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get("date");

  // If date parameter exists, validate it
  if (dateParam) {
    // Try to parse the date using Luxon
    const parsedDate = DateTime.fromISO(dateParam);

    // Check if the date is valid and return it in the required format
    if (parsedDate.isValid) {
      return parsedDate.toFormat("yyyy-MM-dd");
    }
    // If invalid date parameter, we could show a toast notification here
    console.warn("Invalid date parameter, using current date instead");
  }

  // Fall back to the current *local* date, like tradle.net does, so the
  // daily country changes at the player's midnight and matches that site.
  return DateTime.now().toFormat("yyyy-MM-dd");
}

const MAX_TRY_COUNT = 6;

interface GameProps {
  settingsData: SettingsData;
  updateSettings: (newSettings: Partial<SettingsData>) => void;
}

export function Game({ settingsData, updateSettings }: GameProps) {
  const { t, i18n } = useTranslation();
  const isUnlimited = settingsData.gameMode === "unlimited";
  const dayString = useMemo(getDayString, []);
  const isAprilFools = !isUnlimited && dayString.endsWith("04-01");

  // Add a check to see if we're using a historical date
  const isHistoricalPuzzle = useMemo(() => {
    const currentDayString = DateTime.now().toFormat("yyyy-MM-dd");
    return !isUnlimited && dayString !== currentDayString;
  }, [dayString, isUnlimited]);

  const countryInputRef = useRef<HTMLInputElement>(null);

  const session: OECSession = useOECSession();

  const daily = useCountry(dayString);
  const countryPool = useCountryPool();
  const unlimited = useUnlimitedGame(countryPool, MAX_TRY_COUNT);
  const [dailyGuesses, addDailyGuess] = useGuesses(dayString);

  let country = isUnlimited ? unlimited.country : daily.country;
  if (isAprilFools) {
    country = APRIL_FOOLS_TARGET;
  }
  const guesses = isUnlimited ? unlimited.guesses : dailyGuesses;
  const addGuess = isUnlimited ? unlimited.addGuess : addDailyGuess;

  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [countryValue, setCountryValue] = useState<string>("");
  const [hideImageMode, setHideImageMode] = useMode(
    "hideImageMode",
    dayString,
    settingsData.noImageMode
  );
  const [rotationMode, setRotationMode] = useMode(
    "rotationMode",
    dayString,
    settingsData.rotationMode
  );

  const gameEnded =
    guesses.length === MAX_TRY_COUNT ||
    guesses[guesses.length - 1]?.distance === 0;
  const latestGuess = guesses[guesses.length - 1];
  const aprilFoolsHint = isAprilFools ? getAprilFoolsHint(latestGuess) : null;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!country) return;
      const guessedCountry = isAprilFools
        ? getFictionalCountryByName(currentGuess)
        : getCountryByName(currentGuess);

      if (guessedCountry == null) {
        toast.error(t("unknownCountry"));
        return;
      }

      const newGuess = {
        name: currentGuess,
        distance: geolib.getDistance(guessedCountry, country),
        direction: getCompassDirection(guessedCountry, country),
        country: guessedCountry,
      };

      addGuess(newGuess);
      setCurrentGuess("");
      setCountryValue("");
    },
    [addGuess, country, currentGuess, t, isAprilFools]
  );

  const { nextRound } = unlimited;
  const handleNextRound = useCallback(() => {
    toast.dismiss();
    setCurrentGuess("");
    setCountryValue("");
    nextRound();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [nextRound]);

  useEffect(() => {
    if (
      guesses.length === MAX_TRY_COUNT &&
      guesses[guesses.length - 1].distance > 0
    ) {
      const countryName = country
        ? getCountryName(i18n.resolvedLanguage, country)
        : "";
      if (countryName) {
        toast.info(countryName.toUpperCase(), {
          autoClose: false,
          delay: 2000,
        });
      }
    }
  }, [country, guesses, i18n.resolvedLanguage]);

  const toggleDistanceUnit = useCallback(() => {
    updateSettings({
      distanceUnit: settingsData.distanceUnit === "km" ? "miles" : "km",
    });
  }, [settingsData.distanceUnit, updateSettings]);

  const aprilFoolsSrc = `${process.env.PUBLIC_URL}/aprilfools.html`;
  const country3LetterCode = country?.code
    ? countryISOMapping[country.code]?.toLowerCase()
    : "";
  const oecId = getOecCountryId(country);
  const oecLink = isAprilFools
    ? "https://oec.world/"
    : `https://oec.world/en/profile/country/${country3LetterCode}`;

  return (
    <div className="flex-grow flex flex-col mx-2 relative">
      {/* Add an indicator for historical puzzles */}
      {isHistoricalPuzzle && (
        <div
          className="mb-2 border-l-4 border-amber-500 bg-amber-100/90 p-2 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
          role="alert"
        >
          <p className="text-center">
            You are playing a historical puzzle from {dayString}
          </p>
        </div>
      )}
      {hideImageMode && !gameEnded && (
        <button
          className="my-2 rounded-xl border border-slate-300/90 bg-white/70 px-4 py-2 uppercase text-slate-800 shadow-sm transition-colors hover:bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900 dark:active:bg-slate-800"
          type="button"
          onClick={() => setHideImageMode(false)}
        >
          {t("showCountry")}
        </button>
      )}
      {/* <div className="my-1 mx-auto"> */}
      <OecLink />
      {/* <BotMarketLink /> */}
      <h2 className="mb-1 text-center font-bold text-slate-900 dark:text-slate-100">
        Hi{session ? `, ${session?.name || session?.email}` : ""}!{" "}
        {isAprilFools
          ? APRIL_FOOLS_PROMPT
          : "Guess which country exports these products!"}
      </h2>
      {isUnlimited ? (
        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Unlimited · {unlimited.won}/{unlimited.played} won
        </p>
      ) : null}
      {isAprilFools ? (
        <div className="relative h-0 pt-[25px] pb-96 md:pb-[70%]">
          <iframe
            className="absolute inset-0 h-full w-full"
            title="Planet to guess"
            src={aprilFoolsSrc}
            frameBorder="0"
          />
        </div>
      ) : oecId ? (
        <Treemap oecId={oecId} />
      ) : !isUnlimited && !daily.loading ? (
        <div className="my-4 rounded-xl border border-slate-300/80 bg-white/70 p-4 text-center dark:border-slate-700 dark:bg-slate-900/70">
          {daily.scheduled
            ? "Today's country isn't supported here, so there's no daily puzzle today."
            : `There's no daily puzzle scheduled for ${dayString} yet.`}
          <button
            type="button"
            className="mt-3 block w-full rounded-xl bg-slate-800 px-4 py-2 font-semibold text-white dark:bg-oec-orange dark:text-slate-950"
            onClick={() => updateSettings({ gameMode: "unlimited" })}
          >
            Play unlimited instead
          </button>
        </div>
      ) : (
        <div
          className="w-full animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70"
          style={{ height: "clamp(16rem, 52vh, 24rem)" }}
        />
      )}
      {rotationMode && !hideImageMode && !gameEnded && (
        <button
          className="mb-2 rounded-xl border border-slate-300/90 bg-white/70 px-4 py-2 uppercase text-slate-800 shadow-sm transition-colors hover:bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900 dark:active:bg-slate-800"
          type="button"
          onClick={() => setRotationMode(false)}
        >
          {t("cancelRotation")}
        </button>
      )}
      <Guesses
        key={isUnlimited ? `unlimited-${unlimited.round}` : "daily"}
        rowCount={MAX_TRY_COUNT}
        guesses={guesses}
        settingsData={settingsData}
        toggleDistanceUnit={toggleDistanceUnit}
        countryInputRef={countryInputRef}
        isAprilFools={isAprilFools}
      />
      {aprilFoolsHint ? (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2 text-sm italic text-stone-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
          {aprilFoolsHint}
        </div>
      ) : null}
      <div
        className={
          gameEnded
            ? "my-2"
            : // On phones the guess bar sticks to the bottom of the screen so it
              // stays reachable while looking at the treemap / guess rows.
              "sticky bottom-0 z-20 -mx-2 mt-2 border-t border-slate-200/80 bg-white/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90 md:static md:my-2 md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none md:dark:bg-transparent"
        }
      >
        {gameEnded && isUnlimited ? (
          <>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-oec-orange p-3 font-semibold text-white transition-colors hover:bg-oec-yellow hover:text-slate-950 active:bg-oec-orange"
              onClick={handleNextRound}
            >
              Next country →
            </button>
            <a
              className="mt-4 flex w-full justify-center text-center underline"
              href={oecLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("showOnGoogleMaps")}
            </a>
          </>
        ) : gameEnded ? (
          <>
            <Share
              guesses={guesses}
              dayString={dayString}
              settingsData={settingsData}
              hideImageMode={hideImageMode}
              rotationMode={rotationMode}
              won={guesses[guesses.length - 1]?.distance === 0}
              isAprilFools={isAprilFools}
            />
            {!isAprilFools ? (
              <a
                className="underline w-full text-center block mt-4 flex justify-center"
                href={oecLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                {t("showOnGoogleMaps")}
              </a>
            ) : null}
            {isAprilFools ? (
              <div className="w-full text-center block mt-4 flex flex-col justify-center text-2xl font-bold">
                <div>{APRIL_FOOLS_CELEBRATION.top}</div>
                <div>{APRIL_FOOLS_CELEBRATION.middle}</div>
                <div>{APRIL_FOOLS_CELEBRATION.bottom}</div>
              </div>
            ) : null}
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start gap-2 md:block">
              <CountryInput
                countryValue={countryValue}
                setCountryValue={setCountryValue}
                setCurrentGuess={setCurrentGuess}
                theme={settingsData.theme}
                isAprilFools={isAprilFools}
                guesses={guesses}
                placeholder={
                  isAprilFools ? APRIL_FOOLS_PLACEHOLDER : "Pick a location"
                }
              />
              {/* <button
                className="border-2 uppercase my-0.5 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                type="submit"
              >
                🌍 {t("guess")}
              </button> */}
              <div className="shrink-0 text-left">
                <button className="inline-flex h-12 items-center gap-1 whitespace-nowrap rounded-xl bg-slate-800 px-4 font-bold text-white shadow-sm transition-colors hover:bg-slate-900 active:bg-slate-950 dark:bg-oec-orange dark:text-slate-950 dark:hover:bg-orange-300 dark:active:bg-orange-400 md:my-2 md:h-auto md:py-2">
                  {isAprilFools ? "🪱" : "🌍"} <span>Guess</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
