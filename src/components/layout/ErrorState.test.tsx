// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

afterEach(cleanup);

describe("ErrorState", () => {
  it("explains what happened, offers a way out, and calls retry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const retry = vi.fn();
    const err = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorState error={err} retry={retry} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Something went wrong on our side");
    expect(screen.getByText("Reference: abc123")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to the home page" }).getAttribute("href")).toBe("/");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(err); // logged for the error reporting hook
    spy.mockRestore();
  });

  it("can point the way out somewhere else (the admin area)", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorState
        error={new Error("x")}
        retry={() => undefined}
        homeHref="/admin"
        homeLabel="Back to the dashboard"
      />,
    );
    expect(screen.getByRole("link", { name: "Back to the dashboard" }).getAttribute("href")).toBe("/admin");
  });

  it("does not leak the raw error message to customers", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<ErrorState error={new Error("database password is hunter2")} retry={() => undefined} />);
    expect(document.body.textContent).not.toContain("hunter2");
  });
});
