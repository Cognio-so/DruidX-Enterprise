import { LoginForm } from "./_components/login-form";
import Image from "next/image";
import logo from "@/public/DruidX logo.png";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="#"
          className="flex items-center gap-2 self-center text-xl font-bold"
        >
          <Image src={logo} alt="logo" className="size-8" />
          DruidX
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}