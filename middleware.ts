import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/waiter", "/kitchen", "/bar", "/cashier"];
const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isProtected || isPublicPath) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return redirectToLogin(request);

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set({ name, value, ...options })
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToLogin(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role;

  if (pathname.startsWith("/waiter") && userRole !== "waiter" && userRole !== "admin") {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/admin") && userRole !== "admin") {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/kitchen") && userRole !== "kitchen" && userRole !== "admin") {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/bar") && userRole !== "bar" && userRole !== "admin") {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/cashier") && userRole !== "cashier" && userRole !== "admin") {
    return redirectToLogin(request);
  }

  return supabaseResponse;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/waiter/:path*",
    "/kitchen/:path*",
    "/bar/:path*",
    "/cashier/:path*"
  ],
};