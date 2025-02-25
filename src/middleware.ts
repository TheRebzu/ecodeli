import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    console.log("Middleware path:", req.nextUrl.pathname)
    console.log("Token:", req.nextauth.token)

    const isAuthenticated = !!req.nextauth.token
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
    const isCustomerRoute = req.nextUrl.pathname.startsWith("/customer")
    const userRole = req.nextauth.token?.role

    console.log("Auth status:", { isAuthenticated, isAdminRoute, isCustomerRoute, userRole })

    if (isAdminRoute && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (isCustomerRoute && userRole !== "CUSTOMER" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  matcher: ["/admin/:path*", "/customer/:path*"],
}

