import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveStatusIndicator } from "@/components/observability/live-status-indicator";

describe("LiveStatusIndicator", () => {
  it("renders nothing while loading", () => {
    const { container } = render(<LiveStatusIndicator status="loading" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders LIVE on success", () => {
    render(<LiveStatusIndicator status="success" />);

    expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders DISCONNECTED on error", () => {
    render(<LiveStatusIndicator status="error" />);

    expect(screen.getByRole("status", { name: "Disconnected" })).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });
});
