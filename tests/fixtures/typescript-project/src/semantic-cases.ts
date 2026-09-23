declare function consume(callback: () => void): void;
declare function acceptsString(value: string): void;

export async function perform(): Promise<void> {}
perform();

consume(async () => {});
acceptsString(JSON.parse("{}"));
export const unsafeString: string = JSON.parse("{}");

export async function awaitNumber(): Promise<number> {
  return await 42;
}

export async function fromUntypedJson(): Promise<string> {
  return JSON.parse('"value"');
}
