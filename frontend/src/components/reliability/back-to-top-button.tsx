import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const SCROLL_THRESHOLD_PX = 320;
export const MAIN_SCROLL_CONTAINER_ID = "main-scroll-container";

function getScrollContainer(): HTMLElement | null {
  return document.getElementById(MAIN_SCROLL_CONTAINER_ID);
}

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      setVisible(scrollContainer.scrollTop > SCROLL_THRESHOLD_PX);
    };

    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 z-50 h-9 w-9 bg-background/95 shadow-sm backdrop-blur"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        getScrollContainer()?.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
