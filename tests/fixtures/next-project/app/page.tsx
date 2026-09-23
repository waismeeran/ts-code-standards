import { answer } from "@app/model";

export default function Page() {
  const pending: Promise<void> = Promise.resolve();
  pending;
  return <><p>{answer}</p><img src="/hero.jpg" alt="Hero" /><a href="/about">About</a></>;
}
