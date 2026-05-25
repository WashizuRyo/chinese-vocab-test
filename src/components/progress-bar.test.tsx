import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ProgressBar } from "@/components/progress-bar";

test("renders progress", () => {
  render(<ProgressBar current={2} total={5} />);

  expect(screen.getByText("2 / 5")).toBeDefined();
  expect(screen.getByText("40%")).toBeDefined();
});
