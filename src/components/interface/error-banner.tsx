import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import React, { useState, useEffect, useRef } from "react";

export default function ErrorBanner({
    error,
    buttonText,
    onClick,
    className
}: {
    error: string;
    buttonText: string;
    onClick: () => void;
    className?: string;
}) {
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);

        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    const isWide = containerWidth >= 375;

    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full bg-red-900/50 text-red-100 py-4 backdrop-blur-sm rounded-lg border border-red-700",
                className
            )}
            role="alert"
        >
            <div className="px-4">
                <div
                    className={cn(
                        "flex flex-col items-start justify-between overflow-x-hidden",
                        isWide && "flex-row items-center"
                    )}
                >
                    <div
                        className={cn(
                            "flex items-center space-x-4 mb-4",
                            isWide && "mb-0"
                        )}
                    >
                        <TriangleAlertIcon className="h-6 w-6 text-red-300 flex-shrink-0" />
                        <p className="text-base font-medium">
                            {error || "Oops, something went wrong! Please try again."}
                        </p>
                    </div>
                    <div className={cn("w-full mt-0", isWide && "w-auto")}>
                        <Button
                            size="lg"
                            className={cn(
                                "rounded-full w-full bg-red-800 hover:bg-red-900 text-red-100 border-red-700",
                                isWide && "w-auto"
                            )}
                            onClick={onClick}
                        >
                            {buttonText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TriangleAlertIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
