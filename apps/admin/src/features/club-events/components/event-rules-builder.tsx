import { useMemo } from "react";

type EventRulesBuilderProps = {
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
};

type ParsedRulesState = {
  error: string | null;
  perBusinessLimit: number;
};

const defaultPerBusinessLimit = 1;
const maximumPerBusinessLimit = 5;

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

  if (typeof perBusinessLimit !== "number" || !Number.isInteger(perBusinessLimit)) {
    return defaultPerBusinessLimit;
  }

  return Math.min(Math.max(perBusinessLimit, defaultPerBusinessLimit), maximumPerBusinessLimit);
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
      error: "Existing rules JSON is invalid. Choose a limit to rebuild it.",
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

  return JSON.stringify(
    {
      ...rules,
      stampPolicy: {
        perBusinessLimit,
      },
    },
    null,
    2
  );
};

export const EventRulesBuilder = ({ disabled, onChange, value }: EventRulesBuilderProps) => {
  const rulesState = useMemo(() => parseRulesState(value), [value]);

  return (
    <section className="event-rules-builder">
      <div className="review-card-header">
        <div className="stack-sm">
          <span className="field-label">Stamp policy</span>
          <p className="muted-text">
            Controls how many valid leimat one student can collect from the same business in this event.
          </p>
        </div>
        <span className="status-pill">Typed rules</span>
      </div>

      <div className="detail-grid">
        <label className="field">
          <span className="field-label">Same venue limit</span>
          <select
            className="field-input"
            disabled={disabled}
            onChange={(event) => onChange(buildRulesJson(value, Number.parseInt(event.target.value, 10)))}
            value={String(rulesState.perBusinessLimit)}
          >
            <option value="1">1 leima per business</option>
            <option value="2">2 leimat per business</option>
            <option value="3">3 leimat per business</option>
            <option value="4">4 leimat per business</option>
            <option value="5">5 leimat per business</option>
          </select>
        </label>

        <div className="event-rules-preview">
          <span className="field-label">Saved as</span>
          <code>{`stampPolicy.perBusinessLimit = ${rulesState.perBusinessLimit}`}</code>
        </div>
      </div>

      {rulesState.error === null ? null : <p className="inline-error">{rulesState.error}</p>}
    </section>
  );
};
