export type Theme = { id: string; label: string; line: string };

// Every quote carries one or more of these ids in its `tags`.
export const THEMES: Theme[] = [
  { id: "love", label: "Love", line: "the ache and the light" },
  { id: "melancholy", label: "Melancholy", line: "beautiful, quiet sorrow" },
  { id: "stoic", label: "Stoicism", line: "calm in the storm" },
  { id: "wit", label: "Wit", line: "sharp, dry, delicious" },
  { id: "solitude", label: "Solitude", line: "the glory of being alone" },
  { id: "courage", label: "Courage", line: "for the hard days" },
  { id: "wisdom", label: "Wisdom", line: "old minds, clear eyes" },
  { id: "ambition", label: "Ambition", line: "reach beyond the grasp" },
  { id: "nature", label: "Nature", line: "woods, sea and sky" },
  { id: "time", label: "Time", line: "everything that passes" },
  { id: "art", label: "Art", line: "on making things" },
  { id: "hope", label: "Hope", line: "the thing with feathers" },
];

export const themeLabel = (id: string) => THEMES.find((t) => t.id === id)?.label ?? id;
