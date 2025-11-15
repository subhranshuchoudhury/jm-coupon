import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Initialize PocketBase client
const pb = new PocketBase(process.env.POCKETBASE_URL);

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get token from cookies
    const token = request.cookies.get('pb_auth')?.value;
    const role = request.cookies.get('role')?.value; // Still using the flawed cookie as requested

    // --- No Token ---
    if (!token && pathname === "/signin") {
        return NextResponse.next();
    }

    if (!token && pathname !== "/signin") {
        const response = NextResponse.redirect(new URL('/signin', request.url));
        return response;
    }

    // --- Token Exists ---
    if (token) {
        try {
            pb.authStore.save(token);

            if (pb.authStore.isValid) {
                // --- Start of Auth-Valid Logic ---

                if (pathname === "/") {
                    if (role === "admin") {
                        const response = NextResponse.redirect(new URL('/admin', request.url));
                        return response;
                    }
                    // This was missing before for non-admin on "/"
                    return NextResponse.next();
                }

                if (pathname === "/signin") {
                    if (role === "admin") {
                        const response = NextResponse.redirect(new URL('/admin', request.url));
                        return response;
                    }
                    return NextResponse.redirect(new URL('/', request.url));
                }

                if (pathname.includes("admin") && role !== "admin") {
                    const response = NextResponse.redirect(new URL('/', request.url));
                    return response;
                }

                // **LOGIC FIX 1:**
                // If the user is valid and no other rule matched, 
                // (e.g., non-admin at /profile or admin at /admin/dashboard)
                // allow the request to proceed.
                return NextResponse.next();

                // --- End of Auth-Valid Logic ---
            } else {
                // **LOGIC FIX 2:**
                // Token was present but *not* valid (e.g., expired).
                // Force a logout by redirecting to signin and clearing cookies.
                const response = NextResponse.redirect(new URL('/signin', request.url));
                response.cookies.delete('pb_auth');
                response.cookies.delete('role'); // Also clear this
                return response;
            }

        } catch (error) {
            // This catch is for other errors (e.g., pb.authStore.save failed)
            console.log("ERROR", error)
            const response = NextResponse.redirect(new URL('/signin', request.url));
            response.cookies.delete('pb_auth');
            response.cookies.delete('role'); // Also clear this
            return response;
        }
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|images|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|sw.js|icons|offline.html|screenshots).*)',
    ],
}