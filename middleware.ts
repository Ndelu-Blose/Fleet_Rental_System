// Note: Maintenance mode checking is done in driver layout instead
// because middleware runs at edge and can't use Prisma directly
export function middleware() {
  return;
}

export const config = {
  matcher: [],
};

