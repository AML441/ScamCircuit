import Logo from "../icons/Logo";
import Link from "next/link";

export default function NavBar() {
    return (
        <header className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center" aria-label="ScamCircuit home">
                <Logo/><span className="ml-3 text-xl font-bold text-green-800 sm:text-2xl">ScamCircuit</span>
            </Link>
        </header>
    )
}
