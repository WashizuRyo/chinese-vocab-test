import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextStr = typeof next === "string" ? next : "/";
  return (
    <main className="flex flex-1 w-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900">合言葉</h1>
        <p className="mt-1 text-sm text-zinc-500">クラス共有用のあいことばを入力してください。</p>
        <div className="mt-6">
          <LoginForm next={nextStr} />
        </div>
      </div>
    </main>
  );
}
