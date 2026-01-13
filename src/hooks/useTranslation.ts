import { ptBR } from "@/locales/pt-BR";

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof ptBR>;

/**
 * Hook para acessar traduções do sistema
 * Uso: const { t } = useTranslation();
 *      t('actions.save') // retorna "Salvar"
 */
export function useTranslation() {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value: unknown = ptBR;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== "string") {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Substituir parâmetros como {min}, {max}, {count}
    if (params) {
      return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
        return acc.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
      }, value);
    }

    return value;
  };

  return { t, locale: "pt-BR" };
}

/**
 * Função utilitária para tradução direta (sem hook)
 * Uso: translate('actions.save') // retorna "Salvar"
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  const keys = key.split(".");
  let value: unknown = ptBR;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  if (params) {
    return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
      return acc.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    }, value);
  }

  return value;
}

export default useTranslation;
