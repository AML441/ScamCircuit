import Logo from "../icons/Logo";

export default function NavBar() {
    return (
        <div className="flex h-16 w-full items-center  bg-white px-6">
            <Logo/><h2 className="text-green-800 ml-3 text-2xl font-bold">ScamCircuit</h2>
        </div>
    )
}