type ClassValue = string | number | null | false | undefined | ClassValue[];

/**
 * Minimal class-name composer.
 *
 * The component layer keeps variant maps disjoint, so a full `tailwind-merge`
 * conflict resolver is not needed — this stays dependency-free and tree-shakes
 * to nothing meaningful.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue): void => {
    if (!value && value !== 0) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    out.push(String(value));
  };

  inputs.forEach(walk);
  return out.join(" ");
}
