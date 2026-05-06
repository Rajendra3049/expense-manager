function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCategoryName(value: string): string {
  return collapseWhitespace(value).toLocaleLowerCase("en-IN");
}

export function toCategoryDisplayName(value: string): string {
  return normalizeCategoryName(value)
    .split(" ")
    .map((word) =>
      word.length > 0 ? `${word[0].toLocaleUpperCase("en-IN")}${word.slice(1)}` : word,
    )
    .join(" ");
}
