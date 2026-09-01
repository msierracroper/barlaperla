import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center bg-perla-azul-deep px-4">
      <div className="w-full max-w-sm rounded-xl border border-perla-dorado/30 bg-perla-azul p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-perla-dorado">
            La Perla Video Bar
          </h1>
          <p className="mt-1 text-sm text-white/60">La Perla Soft</p>
        </div>

        <LoginForm redirectTo={redirectTo ?? "/"} />
      </div>
    </main>
  );
}
