import type { Config } from "@netlify/functions";

declare const Netlify: {
  env?: {
    get?: (name: string) => string | undefined;
  };
};

function getEnv(name: string) {
  try {
    return Netlify?.env?.get?.(name) || "";
  } catch {
    return "";
  }
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
