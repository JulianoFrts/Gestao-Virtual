import NextAuth from "next-auth";
import authConfig from "./config";

const nextAuth = NextAuth(authConfig);
export const { handlers, signIn, signOut, unstable_update: updateSession } = nextAuth;
export const auth: any = nextAuth.auth;
