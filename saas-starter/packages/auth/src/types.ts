import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      // Optional because the JWT callback only sets it when the id is present.
      id?: string;
      name?: string | null;
      email?: string | null;
    };
    currentOrgId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    currentOrgId?: string;
  }
}
