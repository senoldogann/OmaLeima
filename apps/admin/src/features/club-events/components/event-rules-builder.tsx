import { useMemo } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";

type EventRulesBuilderProps = {
  disabled: boolean;
  locale: DashboardLocale;
  onChange: (value: string) => void;
  value: string;
};

type ParsedRulesState = {
  error: string | null;
  perBusinessLimit: number;
};

type EventRulesBuilderCopy = {
  invalidJson: string;
  limitLabel: string;
  optionLabel: (value: number) => string;
  savedAs: string;
  status: string;
  title: string;
  body: string;
};

const defaultPerBusinessLimit = 1;
const maximumPerBusinessLimit = 5;
const copyByLocale: Record<DashboardLocale, EventRulesBuilderCopy> = {
  en: {
    body: "Controls the total number of valid leimat one student can collect from the same business during this event. One accepted scan records one leima; higher limits require fresh QR scans.",
    invalidJson: "Existing rules JSON is invalid. Choose a limit to rebuild it.",
    limitLabel: "Same venue total stamp limit",
    optionLabel: (value: number): string =>
      value === 1
        ? "1 total leima from the same business"
        : `${value} total leimat from the same business`,
    savedAs: "Saved as",
    status: "Typed rules",
    title: "Stamp policy",
  },
  fi: {
    body: "Määrittää, montako kelvollista leimaa yksi opiskelija voi kerätä samalta yritykseltä tämän tapahtuman aikana. Yksi hyväksytty skannaus lisää yhden leiman; suuremmat rajat vaativat uuden QR-skannauksen.",
    invalidJson: "Nykyinen sääntöjen JSON on virheellinen. Valitse raja, niin se rakennetaan uudelleen.",
    limitLabel: "Saman yrityksen leimojen kokonaisraja",
    optionLabel: (value: number): string =>
      value === 1
        ? "1 leima yhteensä samalta yritykseltä"
        : `${value} leimaa yhteensä samalta yritykseltä`,
    savedAs: "Tallennetaan kenttään",
    status: "Säännöt",
    title: "Leimapolitiikka",
  },
};

const parseRulesObject = (value: string): Record<string, unknown> => {
  if (value.trim().length === 0) {
    return {};
  }

  const parsedValue = JSON.parse(value) as unknown;

  if (parsedValue === null || Array.isArray(parsedValue) || typeof parsedValue !== "object") {
    return {};
  }

  return parsedValue as Record<string, unknown>;
};

const parsePerBusinessLimit = (rules: Record<string, unknown>): number => {
  const stampPolicy = rules.stampPolicy;

  if (stampPolicy === null || Array.isArray(stampPolicy) || typeof stampPolicy !== "object") {
    return defaultPerBusinessLimit;
  }

  const perBusinessLimit = (stampPolicy as Record<string, unknown>).perBusinessLimit;

  const normalizedPerBusinessLimit =
    typeof perBusinessLimit === "number"
      ? perBusinessLimit
      : typeof perBusinessLimit === "string" && /^\d+$/.test(perBusinessLimit)
        ? Number.parseInt(perBusinessLimit, 10)
        : null;

  if (normalizedPerBusinessLimit === null || !Number.isInteger(normalizedPerBusinessLimit)) {
    return defaultPerBusinessLimit;
  }

  return Math.min(Math.max(normalizedPerBusinessLimit, defaultPerBusinessLimit), maximumPerBusinessLimit);
};

const parseRulesState = (value: string): ParsedRulesState => {
  try {
    const rules = parseRulesObject(value);

    return {
      error: null,
      perBusinessLimit: parsePerBusinessLimit(rules),
    };
  } catch {
    return {
      error: "INVALID_JSON",
      perBusinessLimit: defaultPerBusinessLimit,
    };
  }
};

const buildRulesJson = (value: string, perBusinessLimit: number): string => {
  let rules: Record<string, unknown>;

  try {
    rules = parseRulesObject(value);
  } catch {
    rules = {};
  }

  const existingStampPolicy =
    rules.stampPolicy !== null && !Array.isArray(rules.stampPolicy) && typeof rules.stampPolicy === "object"
      ? (rules.stampPolicy as Record<string, unknown>)
      : {};

  return JSON.stringify(
    {
      ...rules,
      stampPolicy: {
        ...existingStampPolicy,
        perBusinessLimit,
      },
    },
    null,
    2
  );
};

export const EventRulesBuilder = ({ disabled, locale, onChange, value }: EventRulesBuilderProps) => {
  const rulesState = useMemo(() => parseRulesState(value), [value]);
  const copy = copyByLocale[locale];

  return (
    <section className="event-rules-builder">
      <div className="review-card-header">
        <div className="stack-sm">
          <span className="field-label">{copy.title}</span>
          <p className="muted-text">{copy.body}</p>
        </div>
        <span className="status-pill">{copy.status}</span>
      </div>

      <div className="detail-grid">
        <label className="field">
          <span className="field-label">{copy.limitLabel}</span>
          <select
            className="field-input"
            disabled={disabled}
            onChange={(event) => onChange(buildRulesJson(value, Number.parseInt(event.target.value, 10)))}
            value={String(rulesState.perBusinessLimit)}
          >
            <option value="1">{copy.optionLabel(1)}</option>
            <option value="2">{copy.optionLabel(2)}</option>
            <option value="3">{copy.optionLabel(3)}</option>
            <option value="4">{copy.optionLabel(4)}</option>
            <option value="5">{copy.optionLabel(5)}</option>
          </select>
        </label>

        <div className="event-rules-preview">
          <span className="field-label">{copy.savedAs}</span>
          <code>{`stampPolicy.perBusinessLimit = ${rulesState.perBusinessLimit}`}</code>
        </div>
      </div>

      {rulesState.error === null ? null : <p className="inline-error">{copy.invalidJson}</p>}
    </section>
  );
};
