import type { Config } from "@netlify/functions";

function getEnv(name: string) {
  const netlify = (globalThis as any).Netlify;
  return netlify?.env?.get?.(name) || "";
}

export default async () => {
  const googleMapsApiKey = getEnv("GOOGLE_MAPS_API_KEY");

  return Response.json(
    { googleMapsApiKey: googleMapsApiKey || null },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
};

export const config: Config = {
  path: "/api/zabava/config"
};
