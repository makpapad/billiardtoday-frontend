export type WpLocale = "el";

type WpDictionary = Record<string, string>;

const dictionaries: Record<WpLocale, WpDictionary> = {
  el: {
    "nav.brand": "BilliardToday",
    "nav.home": "Αρχική",
    "nav.about": "Σχετικά",
    "nav.contact": "Επικοινωνία",
    "nav.privacy": "Απόρρητο",
    "nav.terms": "Όροι Χρήσης",
  },
};

export function tWp(key: string, locale: WpLocale = "el"): string {
  const dict = dictionaries[locale];
  return dict[key] ?? key;
}
