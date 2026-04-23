import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectControl } from "./SelectControl";

describe("SelectControl", () => {
  it("supports keyboard opening, navigation, and selection", () => {
    const onChange = vi.fn();

    render(
      <SelectControl
        ariaLabel="Pilih status"
        onChange={onChange}
        options={[
          { value: "open", label: "Terbuka" },
          { value: "in_progress", label: "Sedang Ditangani" },
          { value: "resolved", label: "Selesai" },
        ]}
        value="open"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Pilih status" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const progressOption = screen.getByRole("option", { name: "Sedang Ditangani" });
    fireEvent.keyDown(progressOption, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("option", { name: "Selesai" }), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("resolved");
  });
});
