type JsonLdObject = Record<string, unknown>;

const jsonLdEscapes: Record<string, string> = {
  "&": "\\u0026",
  "<": "\\u003c",
  ">": "\\u003e",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const escapeJsonLdScriptContent = (value: string): string =>
  value.replace(/[<>&\u2028\u2029]/g, (character) => jsonLdEscapes[character] ?? character);

export const renderJsonLd = (value: JsonLdObject): { __html: string } => {
  // JSON-LD inputs must remain code-owned static content. Escaping prevents the JSON from breaking out of the script tag.
  return {
    __html: escapeJsonLdScriptContent(JSON.stringify(value)),
  };
};
