import React from "react";
import AppFooter from "./AppFooter";

interface PageWithFooterProps {
  children: React.ReactNode;
}

const PageWithFooter: React.FC<PageWithFooterProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-full">
      {/* Add extra padding on mobile to account for fixed footer */}
      <div className="flex-1 pb-32 sm:pb-0">{children}</div>
      <AppFooter />
    </div>
  );
};

export default PageWithFooter;
