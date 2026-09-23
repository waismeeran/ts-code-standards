import { useEffect } from "react";

export function Example({ condition, value }: { condition: boolean; value: number }) {
  if (condition) {
    useEffect(() => {
      console.log(value);
    }, []);
  }

  return <img src="x.png" />;
}

export async function later(): Promise<void> {}

later();
