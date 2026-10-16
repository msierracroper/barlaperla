import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="bg-perla-noche flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl text-perla-dorado">
            La Perla Video Bar
          </h1>
          <p className="mt-1 text-sm text-white/60">La Perla Soft</p>
        </div>

        <LoginForm redirectTo={redirectTo ?? "/"} />
      </div>
    </main>
  );
}
