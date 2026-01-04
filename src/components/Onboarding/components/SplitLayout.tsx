import { ReactNode } from "react";

interface SplitLayoutProps {
    left: ReactNode;
    right: ReactNode;
    className?: string;
}

export const SplitLayout = ({ left, right, className = "" }: SplitLayoutProps) => {
    return (
        <div className={`split-layout ${className}`}>
            {left}
            {right}
        </div>
    );
};
