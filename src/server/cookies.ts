export const ORG_COOKIE = "hl_org";

export type CookieWrite = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    path: string;
    secure: boolean;
    maxAge: number;
  };
};

export function orgCookie(slug: string): CookieWrite {
  return {
    name: ORG_COOKIE,
    value: slug,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 400,
    },
  };
}

export function clearOrgCookie(): CookieWrite {
  return {
    name: ORG_COOKIE,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    },
  };
}
