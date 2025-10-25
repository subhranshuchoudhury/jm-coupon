import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Initialize PocketBase client
const pb = new PocketBase(process.env.POCKETBASE_URL);

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // console.log("PATH NAME", pathname)

    // Get token from cookies
    const token = request.cookies.get('pb_auth')?.value;


    if (!token && pathname === "/signin") {
        return NextResponse.next();
    }

    if (!token && pathname !== "/signin") {
        const response = NextResponse.redirect(new URL('/signin', request.url));
        return response;
    }


    if (token) {
        try {
            pb.authStore.save(token);

            if (pb.authStore.isValid) {


                if (pathname === "/signin") {
                    const response = NextResponse.redirect(new URL('/', request.url));
                    return response;
                }

                const response = NextResponse.next();
                return response;
            } else {
                throw new Error('Invalid token');
            }
        } catch (error) {

            console.log("ERROR", error)
            const response = NextResponse.redirect(new URL('/signin', request.url));
            response.cookies.delete('pb_auth');
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
        '/((?!api|images|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|offline.html|sw.js).*)',
    ],
}