import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Vault | Dove",
    description: "TBA"
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
