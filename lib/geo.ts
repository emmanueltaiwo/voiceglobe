import { iso1A2Code } from "country-coder";
import { flag, name } from "country-emoji";

export function getCountryFromCoords(
  lat: number,
  lng: number,
): { code: string; flag: string; name: string } | null {
  const code = iso1A2Code([lng, lat]);

  if (!code) return null;

  const flagEmoji = flag(code);
  const countryName = name(code) ?? code;

  if (!flagEmoji) return null;

  return { code, flag: flagEmoji, name: countryName };
}
