"use client";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { type Answer, type Question } from "@/lib/platform-api";
import { Button, Field } from "./ui";
export function AnswerControl({
  question,
  answer,
  onChange,
  disabled = false,
}: {
  question: Question;
  answer?: Answer;
  onChange: (value: Answer) => void;
  disabled?: boolean;
}) {
  const { type, choices } = question;
  if (
    type === "single_choice" ||
    type === "true_false" ||
    type === "multiple_select"
  )
    return (
      <fieldset className="qb-answers">
        <legend className="qb-sr-only">
          {type === "multiple_select"
            ? "Select all that apply"
            : "Choose one answer"}
        </legend>
        {choices.map((choice, index) => {
          const selected =
            type === "multiple_select"
              ? Array.isArray(answer) && answer.includes(choice.id)
              : answer === choice.id;
          return (
            <label
              key={choice.id}
              className={`qb-answer ${selected ? "is-selected" : ""}`}
            >
              <input
                type={type === "multiple_select" ? "checkbox" : "radio"}
                name={`answer-${question.id}`}
                value={choice.id}
                checked={selected}
                disabled={disabled}
                onChange={() =>
                  onChange(
                    type === "multiple_select"
                      ? selected
                        ? (answer as string[]).filter((id) => id !== choice.id)
                        : [...(Array.isArray(answer) ? answer : []), choice.id]
                      : choice.id,
                  )
                }
              />
              <span className="qb-answer-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{choice.text}</span>
              {selected && <Check size={18} />}
            </label>
          );
        })}
      </fieldset>
    );
  if (type === "matching")
    return (
      <div className="qb-matching">
        {choices.map((choice) => (
          <Field key={choice.id} label={choice.text}>
            <select
              disabled={disabled}
              value={
                typeof answer === "object" && !Array.isArray(answer)
                  ? answer[choice.id] || ""
                  : ""
              }
              onChange={(event) =>
                onChange({
                  ...(typeof answer === "object" && !Array.isArray(answer)
                    ? answer
                    : {}),
                  [choice.id]: event.target.value,
                })
              }
            >
              <option value="">Choose a match</option>
              {(
                question.matchingTargets ||
                (typeof question.correctAnswer === "object" &&
                !Array.isArray(question.correctAnswer)
                  ? [...new Set(Object.values(question.correctAnswer))]
                  : [])
              ).map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </div>
    );
  if (type === "ordering") {
    const ids = Array.isArray(answer)
      ? answer
      : choices.map((choice) => choice.id);
    const move = (index: number, delta: number) => {
      const next = [...ids];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      onChange(next);
    };
    return (
      <div className="qb-ordering">
        <p className="qb-muted">Arrange these items in the correct order.</p>
        {ids.map((id, index) => (
          <div key={id}>
            <span className="qb-order-number">{index + 1}</span>
            <span>{choices.find((choice) => choice.id === id)?.text}</span>
            <Button
              type="button"
              variant="quiet"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Move item ${index + 1} up`}
            >
              <ArrowUp size={17} />
            </Button>
            <Button
              type="button"
              variant="quiet"
              disabled={disabled || index === ids.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Move item ${index + 1} down`}
            >
              <ArrowDown size={17} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onChange(ids)}
        >
          Confirm this order
        </Button>
      </div>
    );
  }
  if (type === "essay")
    return (
      <Field
        label="Your response"
        hint="This response requires human review; it is not automatically graded."
      >
        <textarea
          rows={9}
          disabled={disabled}
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Take a moment to organize your thoughts…"
        />
      </Field>
    );
  return (
    <Field label={type === "numeric" ? "Your numerical answer" : "Your answer"}>
      <input
        disabled={disabled}
        type={type === "numeric" ? "number" : "text"}
        step={type === "numeric" ? "any" : undefined}
        value={
          typeof answer === "string" || typeof answer === "number" ? answer : ""
        }
        onChange={(event) =>
          onChange(
            type === "numeric" && event.target.value !== ""
              ? Number(event.target.value)
              : event.target.value,
          )
        }
        autoComplete="off"
        placeholder={
          type === "fill_blank"
            ? "Complete the missing text"
            : "Enter your answer"
        }
      />
    </Field>
  );
}
