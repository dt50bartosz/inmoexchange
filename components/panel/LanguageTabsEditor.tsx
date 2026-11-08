"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CONTENT_LANGUAGES, langLabel, orderedLangs, type LangCode, type MultiLangText } from "@/lib/constants/languages";
import { useValidationMessage } from "@/components/panel/useValidationMessage";

type Props = {
  value: MultiLangText;
  onChange: (next: MultiLangText) => void;
  /** Error keys per language (from zod). */
  errors?: Partial<Record<LangCode, string>>;
  maxLength: number;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  /** Optional default/fallback language. Required, can't be removed. */
  defaultLanguage?: LangCode;
  onDefaultChange?: (code: LangCode) => void;
  onBlur?: () => void;
};

/** One textarea per language, switched with tabs. Used for the About page and property descriptions. */
export default function LanguageTabsEditor({
  value,
  onChange,
  errors = {},
  maxLength,
  placeholder,
  rows = 8,
  disabled,
  defaultLanguage,
  onDefaultChange,
  onBlur,
}: Props) {
  const t = useTranslations("panel.common");
  const tv = useValidationMessage();
  const uid = useId();
  // The default language always has a tab, even before it has text: it's required, and its error needs a place to show
  const present = orderedLangs(value, defaultLanguage);
  const codes = defaultLanguage && !present.includes(defaultLanguage) ? [defaultLanguage, ...present] : present;
  const available = CONTENT_LANGUAGES.filter((l) => !codes.includes(l.code));

  const [picked, setPicked] = useState<LangCode | null>(codes[0] ?? null);
  const active: LangCode | null = picked && codes.includes(picked) ? picked : codes[0] ?? null;
  const [removing, setRemoving] = useState<LangCode | null>(null);

  // After a failed save, open a tab that has an error if the open one has none, so the message is visible
  const errorKey = codes.filter((c) => errors[c]).join(",");
  useEffect(() => {
    if (!errorKey || (active && errors[active])) return;
    setPicked(errorKey.split(",")[0] as LangCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the set of errors changes
  }, [errorKey]);

  const add = (code: LangCode) => {
    onChange({ ...value, [code]: "" });
    setPicked(code);
  };

  const remove = (code: LangCode) => {
    const next = { ...value };
    delete next[code];
    onChange(next);
    setPicked(defaultLanguage ?? null);
    setRemoving(null);
  };

  const askRemove = (code: LangCode) => {
    if ((value[code] ?? "").trim()) setRemoving(code);
    else remove(code);
  };

  const text = active ? value[active] ?? "" : "";
  const error = active ? errors[active] : undefined;
  const isDefault = !!active && active === defaultLanguage;
  const canRemove = !!active && !isDefault && !disabled && (defaultLanguage ? true : codes.length > 1);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {codes.length > 0 && (
          <Tabs value={active ?? undefined} onValueChange={(v) => setPicked(v as LangCode)}>
            <TabsList>
              {codes.map((code) => {
                const filled = !!value[code]?.trim();
                const hasError = !!errors[code];
                return (
                  <TabsTrigger key={code} value={code} className="gap-1.5">
                    <span
                      aria-hidden
                      className={`size-2 rounded-full ${
                        hasError ? "bg-destructive" : filled ? "bg-primary" : "border border-muted-foreground"
                      }`}
                    />
                    {langLabel(code)}
                    {code === defaultLanguage && <span className="text-xs text-muted-foreground">({t("default")})</span>}
                    <span className="sr-only">
                      {hasError ? t("langStatusError") : filled ? t("langStatusFilled") : t("langStatusEmpty")}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}

        {available.length > 0 && !disabled && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" />}>
              <Plus aria-hidden className="size-4" />
              {t("addLanguage")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {available.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => add(l.code)}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {active ? (
        <div className="pt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor={`${uid}-text`} className="text-sm font-medium">
              {t("textIn", { language: langLabel(active) })}
              {isDefault && (
                <span className="ml-0.5 text-destructive" aria-hidden>
                  *
                </span>
              )}
            </label>
            <span className={`text-xs tabular-nums ${text.length > maxLength ? "text-destructive" : "text-muted-foreground"}`}>
              {text.length}/{maxLength}
            </span>
          </div>
          <Textarea
            id={`${uid}-text`}
            rows={rows}
            value={text}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? `${uid}-err` : undefined}
            onChange={(e) => onChange({ ...value, [active]: e.target.value })}
            onBlur={onBlur}
            className="leading-relaxed"
          />
          {error && (
            <p id={`${uid}-err`} className="mt-1.5 text-sm text-destructive">
              {tv(error)}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            {isDefault ? (
              <p className="text-muted-foreground">{t("defaultLanguageNote")}</p>
            ) : (
              <span>
                {defaultLanguage && onDefaultChange && !disabled && (
                  <Button type="button" variant="link" size="sm" onClick={() => onDefaultChange(active)}>
                    {t("makeDefault", { language: langLabel(active) })}
                  </Button>
                )}
              </span>
            )}
            {canRemove && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => askRemove(active)}>
                {t("removeLanguage", { language: langLabel(active) })}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="pt-4 text-sm text-muted-foreground">{t("noLanguagesYet")}</p>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removing && t("removeLanguageTitle", { language: langLabel(removing) })}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeLanguageBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => removing && remove(removing)}>
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
