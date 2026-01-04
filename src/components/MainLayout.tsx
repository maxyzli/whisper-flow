import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import "../styles/main.css";

interface MainLayoutProps {
    children: ReactNode;
    activeTab: "home" | "history" | "settings";
    onTabChange: (tab: "home" | "history" | "settings") => void;
}

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
    return (
        <div className="main-layout">
            <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
            <div className="main-content">
                {children}
            </div>
        </div>
    );
}
